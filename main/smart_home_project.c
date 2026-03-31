#include <stdio.h>
#include <string.h>
#include <inttypes.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "driver/spi_master.h"
#include "esp_log.h"

#include "buzzer.h"
#include "analog_sensors.h" 
#include "rc522.h"
#include "driver/rc522_spi.h"
#include "dht.h"
#include "relay.h"
#include "button.h"
#include "wifi_manager.h" 
#include "mqtt_manager.h" 

static const char *TAG = "SMART_HOME_MAIN";

// Thông tin Thẻ Master và Ngưỡng
const uint8_t MASTER_UID[] = {0x9C, 0xD4, 0xF8, 0x05};
#define DHT11_PIN 8
#define HIGH_GAS_THRESHOLD_MV 2000
#define LOW_GAS_THRESHOLD_MV 1500

// Cấu hình SPI RFID
#define RC522_MISO_PIN 2
#define RC522_MOSI_PIN 7
#define RC522_SCLK_PIN 6
#define RC522_CS_PIN   10
#define RC522_RST_PIN  11

static rc522_handle_t scanner; 

// Biến lưu trạng thái Relay
 bool r1_on = false;
 bool r2_on = false;
 bool r3_on = false; 
 bool r4_on = false; 
 TaskHandle_t mqtt_task_handle = NULL;

// --- BIẾN TOÀN CỤC LƯU DỮ LIỆU CẢM BIẾN MỚI NHẤT ---
static float current_temp = 0.0;
static float current_hum = 0.0;
static float current_light = 0.0;
static int current_gas = 0;

// Task MQTT
void mqtt_telemetry_task(void *pvParameters) {
    ESP_LOGI(TAG, "Task MQTT Telemetry đã sẵn sàng.");
    while (1) {
        // Đợi tối đa 5000ms. 
        // - Nếu hết 5s không ai gọi -> tự dậy báo cáo (dữ liệu định kỳ).
        // - Nếu có người gọi (qua xTaskNotifyGive) -> thức dậy và báo cáo ngay lậP tức  
        ulTaskNotifyTake(pdTRUE, pdMS_TO_TICKS(5000));
        mqtt_publish_sensor_data(current_temp, current_hum, current_gas, current_light, r1_on, r2_on, r3_on, r4_on);
    }
}

// Task button 
void button_control_task(void *pvParameter) {
    int pin_num;
    while (1) {
        if (xQueueReceive(button_event_queue, &pin_num, portMAX_DELAY)) {// Nhận được sự kiện từ hàng đợi
            ESP_LOGW(TAG, ">>> ESP32 NHẬN TÍN HIỆU TỪ CHÂN GPIO SỐ: %d", pin_num);
            vTaskDelay(pdMS_TO_TICKS(50)); // Debounce: Đợi 50ms để tránh nhiễu
            if (gpio_get_level(pin_num) == 0) { // Xác nhận nút vẫn đang được nhấn sau debounce
                if (pin_num == 3) {   // nếu chân có gpio = 1 được nhấn, thì sẽ đổi trạng thái Relay 1, và in ra log tương ứng
                    r1_on = !r1_on; // đổi trạng thái
                    relay_ch1_set(r1_on); // Cập nhật Relay
                    ESP_LOGI(TAG, "Nút 1: Đã %s Relay 1", r1_on ? "BẬT" : "TẮT");
                    if (mqtt_task_handle != NULL) {// đánh thức Task MQTT Telemetry để gửi dữ liệu lên Cloud ngay lập tức khi có sự thay đổi trạng thái Relay
                        xTaskNotifyGive(mqtt_task_handle);
                    }
                }else if (pin_num == 9) { 
                    r2_on = !r2_on;
                    relay_ch2_set(r2_on);
                    ESP_LOGI(TAG, "Nút 2: Đã %s Relay 2", r2_on ? "BẬT" : "TẮT");
                    if(mqtt_task_handle != NULL) {
                        xTaskNotifyGive(mqtt_task_handle);
                    }
                }else if(pin_num == 23){ 
                    r3_on = !r3_on;
                    relay_ch3_set(r3_on);
                    ESP_LOGI(TAG, "Nút 3: Đã %s Relay 3", r3_on ? "BẬT" : "TẮT");
                    if(mqtt_task_handle != NULL) {
                        xTaskNotifyGive(mqtt_task_handle);
                    }
                }else if(pin_num == 22){
                    r4_on = !r4_on;
                    relay_ch4_set(r4_on);
                    ESP_LOGI(TAG, "Nút 4: Đã %s Relay 4", r4_on ? "BẬT" : "TẮT");
                    if(mqtt_task_handle != NULL) {
                        xTaskNotifyGive(mqtt_task_handle);
                    }
                }

                while (gpio_get_level(pin_num) == 0) vTaskDelay(pdMS_TO_TICKS(10)); // Đợi đến khi nút được thả ra để tránh việc nhận nhiều lần do giữ nút quá lâu
            }
        }
    }
}

//  TASK XỬ LÝ KHÍ GAS 
void gas_task(void *pvParameters){
    while(1){
        current_gas = analog_get_gas_voltage(); // Cập nhật biến toàn cục, lấy giá trị điện áp từ cảm biến Gas
        if(current_gas > HIGH_GAS_THRESHOLD_MV){ 
            ESP_LOGW(TAG, "!!! NGUY HIỂM : Phát hiện rò rỉ Gas"); // ESP_LOWG : dùng để in đậm cảnh báo 
            relay_ch1_set(true); // mở cửa (relay1) để thoát khí
            r1_on = true; // Cập nhật, đồng bộ trạng thái Relay 1
            buzzer_set_mode(BUZZER_ALARM_FAST);
        } else if(current_gas > LOW_GAS_THRESHOLD_MV){
            buzzer_set_mode(BUZZER_ALARM_SLOW);
        } else {
            buzzer_set_mode(BUZZER_OFF);
        }
        vTaskDelay(pdMS_TO_TICKS(1000)); 
    }
}

// Task RFID - xử lý quẹt thẻ 
static void on_picc_state_changed(void *arg, esp_event_base_t base, int32_t event_id, void *data) {
    rc522_picc_state_changed_event_t *event = (rc522_picc_state_changed_event_t *)data; // 
    rc522_picc_t *picc = event->picc;
    // Trích xuất đối tượng 'picc' (Proximity Integrated Circuit Card - tức là thẻ RFID) từ cấu trúc sự kiện 'event'.
    // Biến 'picc' này sẽ chứa mọi thông tin về cái thẻ vừa được quét, ví dụ như mã UID (picc->uid.value) hoặc 
    // trạng thái của thẻ (picc->state) mà chúng ta có thể sử dụng để quyết định xem có phải là thẻ Master hay không,
    // và từ đó thực hiện hành động tương ứng (như mở cửa).

    if (picc->state == RC522_PICC_STATE_ACTIVE) {
        mqtt_publish_rfid(picc->uid.value);
        // Bắn mã thẻ UID lên Server (MQTT Cloud) ngay lập tức để lưu log ra/vào
        if (memcmp(picc->uid.value, MASTER_UID, 4) == 0) { // So sánh 4 byte UID của thẻ vừa quét với MASTER_UID được định nghĩa ở trên
            ESP_LOGI(TAG, "MASTER DETECTED: Mở cửa...");
            relay_ch1_set(true); 
            vTaskDelay(pdMS_TO_TICKS(3000));
            r1_on = true; // Cập nhật, đồng bộ lại trạng thái Relay 1
        } else {
            ESP_LOGW(TAG, "Thẻ lạ!");
        }
    }
}

// task cảm biến nhiệt độ, độ ẩm DHT11
void dht11_task(void *pvParameters) {
    float temp, hum;
    while (1) {
        vTaskDelay(pdMS_TO_TICKS(2000)); 
        if (dht_read_float_data(DHT_TYPE_DHT11, (gpio_num_t)DHT11_PIN, &hum, &temp) == ESP_OK) {
            current_temp = temp; // Cập nhật biến toàn cục
            current_hum = hum;   // Cập nhật biến toàn cục
            ESP_LOGI("DHT11", "%.1f°C | %.1f%%", temp, hum);
        }else {
            ESP_LOGE("DHT11", "Lỗi đọc dữ liệu từ DHT11!");
        }
    }
}

// task cảm biến ánh sáng
void light_task(void *pv){
    while(1){
        current_light = analog_get_light_percentage(); // Cập nhật biến toàn cục
        ESP_LOGI("LIGHT", "Độ sáng: %.1f%%", current_light);
        vTaskDelay(pdMS_TO_TICKS(2000)); 
    }
}

// Main 
void app_main(void) {
    ESP_LOGI(TAG, "Khởi động Smart Home Firmware...");

    buzzer_init(20); // GPIO 20 cho còi
    relay_init(); // Khởi tạo Relay (tắt tất cả kênh)
    ESP_ERROR_CHECK(analog_sensors_init()); // Khởi tạo ADC cho cảm biến Gas và Ánh sáng

    button_t btn1 = { .pin = 3 };// khởi tạo cấu trúc các nút bấm với chân GPIO tương ứng
    button_t btn2 = { .pin = 9 };
    button_t btn3 = { .pin = 23 };
    button_t btn4 = { .pin = 22 };
    
    button_init(&btn1); // Gọi hàm setup ngắt (interrupt) và hàng đợi (queue) cho nút nhấn
    button_init(&btn2);
    button_init(&btn3);
    button_init(&btn4);

    spi_bus_config_t buscfg = { // Cấu hình bus SPI cho RC522
        .miso_io_num = RC522_MISO_PIN,
        .mosi_io_num = RC522_MOSI_PIN,
        .sclk_io_num = RC522_SCLK_PIN,
        .quadwp_io_num = -1,  // Không sử dụng chân WP (Write Protect)
        .quadhd_io_num = -1,  // Không sử dụng chân HD (Hold) 
    };
    rc522_spi_config_t driver_config = {// Cấu hình driver SPI cho RC522
        .host_id = SPI2_HOST,
        .bus_config = &buscfg,
        .dev_config = { 
            .spics_io_num = RC522_CS_PIN 
        },
        .rst_io_num = RC522_RST_PIN,
    };
    rc522_driver_handle_t driver;
    ESP_ERROR_CHECK(rc522_spi_create(&driver_config, &driver));
    ESP_ERROR_CHECK(rc522_driver_install(driver));
    rc522_config_t scanner_config = { 
        .driver = driver 
    };
    ESP_ERROR_CHECK(rc522_create(&scanner_config, &scanner));
    rc522_register_events(scanner, RC522_EVENT_PICC_STATE_CHANGED, on_picc_state_changed, NULL);
    ESP_ERROR_CHECK(rc522_start(scanner));

    // 1. Khởi tạo Wi-Fi
    wifi_init_sta();

    // 2. Chờ Wi-Fi ổn định và kích hoạt MQTT
    vTaskDelay(pdMS_TO_TICKS(2000));
    mqtt_app_start();

    // 3. Tạo các Task
    xTaskCreate(button_control_task, "btn_task", 4096, NULL, 15, NULL); 
    xTaskCreate(gas_task, "gas_task", 4096, NULL, 5, NULL);
    xTaskCreate(dht11_task, "dht11_task", 4096, NULL, 5, NULL);
    xTaskCreate(light_task, "light_task", 4096, NULL, 5, NULL); 
    
    // 4. Kích hoạt Task đẩy dữ liệu MQTT 
    xTaskCreate(mqtt_telemetry_task, "mqtt_tel_task", 4096, NULL, 5, &mqtt_task_handle);
}