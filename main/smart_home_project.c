#include <stdio.h>
#include <string.h>
#include <inttypes.h>
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "driver/gpio.h"
#include "driver/spi_master.h"
#include "esp_log.h"

// Components của Chính
#include "buzzer.h"
#include "analog_sensors.h" 
#include "rc522.h"
#include "driver/rc522_spi.h"
#include "dht.h"
#include "relay.h"
#include "button.h"

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

// Biến lưu trạng thái Relay (Toggle)
static bool r1_on = false;
static bool r2_on = false;

// --- TASK XỬ LÝ NÚT NHẤN (TỪ QUEUE) ---
void button_control_task(void *pvParameter) {
    int pin_num;
    ESP_LOGI(TAG, "Task điều khiển nút nhấn đã sẵn sàng.");
    while (1) {
        // Đợi tín hiệu từ Queue (Ngắt gửi tới)
        if (xQueueReceive(button_event_queue, &pin_num, portMAX_DELAY)) {
            vTaskDelay(pdMS_TO_TICKS(50)); // Chống dội (Debounce)
            
            if (gpio_get_level(pin_num) == 0) { // Nếu nút vẫn đang nhấn
                if (pin_num == 3) { // Nút 3 -> Relay 1
                    r1_on = !r1_on;
                    relay_ch1_set(r1_on);
                    ESP_LOGI(TAG, "Nút 1: Đã %s Relay 1", r1_on ? "BẬT" : "TẮT");
                } 
                else if (pin_num == 9) { // Nút 9 -> Relay 2
                    r2_on = !r2_on;
                    relay_ch2_set(r2_on);
                    ESP_LOGI(TAG, "Nút 2: Đã %s Relay 2", r2_on ? "BẬT" : "TẮT");
                }
                
                // Đợi thả nút để tránh lặp lệnh
                while (gpio_get_level(pin_num) == 0) vTaskDelay(pdMS_TO_TICKS(10));
            }
        }
    }
}

// --- TASK XỬ LÝ KHÍ GAS ---
void gas_task(void *pvParameters){
    while(1){
        int a = analog_get_gas_voltage(); 
        if(a > HIGH_GAS_THRESHOLD_MV){
            ESP_LOGW(TAG, "!!! NGUY HIỂM : Phát hiện rò rỉ Gas");
            relay_ch2_set(true); // Bật quạt thông gió (Relay 2)
            r2_on = true;
            buzzer_set_mode(BUZZER_ALARM_FAST);
        } else if(a > LOW_GAS_THRESHOLD_MV){
            buzzer_set_mode(BUZZER_ALARM_SLOW);
        } else {
            buzzer_set_mode(BUZZER_OFF);
            // Không tự tắt Relay 2 ở đây để tránh xung đột với nút nhấn nếu bạn muốn bật quạt thủ công
        }
        vTaskDelay(pdMS_TO_TICKS(1000)); 
    }
}

// --- CALLBACK RFID ---
static void on_picc_state_changed(void *arg, esp_event_base_t base, int32_t event_id, void *data) {
    rc522_picc_state_changed_event_t *event = (rc522_picc_state_changed_event_t *)data;
    rc522_picc_t *picc = event->picc;

    if (picc->state == RC522_PICC_STATE_ACTIVE) {
        if (memcmp(picc->uid.value, MASTER_UID, 4) == 0) {
            ESP_LOGI(TAG, "MASTER DETECTED: Mở cửa...");
            relay_ch1_set(true); 
            vTaskDelay(pdMS_TO_TICKS(3000));
            relay_ch1_set(false);
            r1_on = false; // Cập nhật lại trạng thái biến
        } else {
            ESP_LOGW(TAG, "Thẻ lạ!");
        }
    }
}

// --- CÁC TASK KHÁC (DHT11, LIGHT) GIỮ NGUYÊN ---
void dht11_task(void *pvParameters) {
    float temp, hum;
    while (1) {
        vTaskDelay(pdMS_TO_TICKS(2000)); 
        if (dht_read_float_data(DHT_TYPE_DHT11, (gpio_num_t)DHT11_PIN, &hum, &temp) == ESP_OK) {
            ESP_LOGI("DHT11", "%.1f°C | %.1f%%", temp, hum);
        }
    }
}

void light_task(void *pv){
    while(1){
        float light = analog_get_light_percentage(); 
        ESP_LOGI("LIGHT", "Độ sáng: %.1f%%", light);
        vTaskDelay(pdMS_TO_TICKS(2000)); 
    }
}

// --- HÀM MAIN ---
void app_main(void) {
    ESP_LOGI(TAG, "Khởi động Smart Home...");

    // 1. Khởi tạo ngoại vi
    buzzer_init(20);
    relay_init();
    ESP_ERROR_CHECK(analog_sensors_init());

    // 2. Khởi tạo Button (GPIO 1 và 3)
    button_t btn1 = { .pin = 3 };
    button_t btn2 = { .pin = 9 };
    button_init(&btn1);
    button_init(&btn2);

    // 3. Khởi tạo RFID (SPI)
    spi_bus_config_t buscfg = {
        .miso_io_num = RC522_MISO_PIN,
        .mosi_io_num = RC522_MOSI_PIN,
        .sclk_io_num = RC522_SCLK_PIN,
        .quadwp_io_num = -1, .quadhd_io_num = -1,
    };
    rc522_spi_config_t driver_config = {
        .host_id = SPI2_HOST,
        .bus_config = &buscfg,
        .dev_config = { .spics_io_num = RC522_CS_PIN },
        .rst_io_num = RC522_RST_PIN,
    };
    rc522_driver_handle_t driver;
    ESP_ERROR_CHECK(rc522_spi_create(&driver_config, &driver));
    ESP_ERROR_CHECK(rc522_driver_install(driver));
    rc522_config_t scanner_config = { .driver = driver };
    ESP_ERROR_CHECK(rc522_create(&scanner_config, &scanner));
    rc522_register_events(scanner, RC522_EVENT_PICC_STATE_CHANGED, on_picc_state_changed, NULL);
    ESP_ERROR_CHECK(rc522_start(scanner));

    // 4. Tạo các Task
    xTaskCreate(button_control_task, "btn_task", 4096, NULL, 15, NULL); // Ưu tiên cao nhất
    xTaskCreate(gas_task, "gas_task", 4096, NULL, 5, NULL);
    xTaskCreate(dht11_task, "dht11_task", 4096, NULL, 5, NULL);
    xTaskCreate(light_task, "light_task", 4096, NULL, 5, NULL); 
}