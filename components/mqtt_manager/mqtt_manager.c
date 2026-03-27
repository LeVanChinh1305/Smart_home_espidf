#include <stdio.h>
#include <string.h>
#include "esp_log.h"
#include "mqtt_client.h"
#include "cJSON.h"        // Thư viện xử lý JSON của ESP-IDF
#include "relay.h"        // Để điều khiển Relay trực tiếp từ đây
#include "mqtt_manager.h"

static const char *TAG = "MQTT_MANAGER";
static esp_mqtt_client_handle_t client = NULL;

// Topic để gửi dữ liệu lên (Publish)
#define TOPIC_SENSORS "smarthub/chinh/sensors"
#define TOPIC_RFID    "smarthub/chinh/rfid"

// Topic để lắng nghe lệnh điều khiển (Subscribe)
#define TOPIC_CONTROL "smarthub/chinh/control"

// --- HÀM XỬ LÝ SỰ KIỆN MQTT ---
static void mqtt_event_handler(void *handler_args, esp_event_base_t base, int32_t event_id, void *event_data) {
    esp_mqtt_event_handle_t event = event_data;
    
    switch ((esp_mqtt_event_id_t)event_id) {
        case MQTT_EVENT_CONNECTED:
            ESP_LOGI(TAG, "🟢 Đã kết nối tới MQTT Broker!");
            // Đăng ký nhận tin nhắn từ topic Control
            esp_mqtt_client_subscribe(client, TOPIC_CONTROL, 0);
            ESP_LOGI(TAG, "Đã Subscribe topic: %s", TOPIC_CONTROL);
            break;

        case MQTT_EVENT_DISCONNECTED:
            ESP_LOGW(TAG, "🔴 Mất kết nối MQTT! Hệ thống sẽ tự động kết nối lại.");
            break;

        case MQTT_EVENT_DATA:
            ESP_LOGI(TAG, "📥 NHẬN ĐƯỢC LỆNH ĐIỀU KHIỂN TỪ WEB!");
            // In ra nội dung tin nhắn nhận được
            printf("Topic: %.*s\n", event->topic_len, event->topic);
            printf("Data: %.*s\n", event->data_len, event->data);

            // --- XỬ LÝ JSON TỪ WEB ---
            // Giả sử Web gửi: {"relay": 1, "state": 1}
            cJSON *json = cJSON_ParseWithLength(event->data, event->data_len);
            if (json != NULL) {
                cJSON *relay_item = cJSON_GetObjectItem(json, "relay");
                cJSON *state_item = cJSON_GetObjectItem(json, "state");

                if (cJSON_IsNumber(relay_item) && cJSON_IsNumber(state_item)) {
                    int relay_num = relay_item->valueint;
                    int relay_state = state_item->valueint; // 1 = Bật, 0 = Tắt

                    if (relay_num == 1) {
                        relay_ch1_set(relay_state);
                        ESP_LOGI(TAG, "-> Đã %s Relay 1 qua MQTT", relay_state ? "BẬT" : "TẮT");
                    } else if (relay_num == 2) {
                        relay_ch2_set(relay_state);
                        ESP_LOGI(TAG, "-> Đã %s Relay 2 qua MQTT", relay_state ? "BẬT" : "TẮT");
                    }
                } else {
                    ESP_LOGW(TAG, "JSON sai định dạng!");
                }
                cJSON_Delete(json); // Giải phóng RAM sau khi dùng xong (BẮT BUỘC)
            }
            break;

        case MQTT_EVENT_ERROR:
            ESP_LOGE(TAG, "Lỗi kết nối MQTT");
            break;

        default:
            break;
    }
}

// --- HÀM KHỞI TẠO MQTT ---
void mqtt_app_start(void) {
    esp_mqtt_client_config_t mqtt_cfg = {
        .broker.address.uri = "mqtt://broker.hivemq.com", // Public Broker miễn phí
    };

    client = esp_mqtt_client_init(&mqtt_cfg);
    esp_mqtt_client_register_event(client, ESP_EVENT_ANY_ID, mqtt_event_handler, NULL);
    esp_mqtt_client_start(client);
}

// --- HÀM BẮN DỮ LIỆU CẢM BIẾN ---
void mqtt_publish_sensor_data(float temp, float hum, int gas, float light, bool r1, bool r2) {
    if (client == NULL) return;
    
    // Tăng kích thước mảng lên một chút cho an toàn
    char payload[256]; 
    
    // Đóng gói thêm r1 và r2 (chuyển bool thành 1 hoặc 0)
    snprintf(payload, sizeof(payload), 
             "{\"temp\":%.1f, \"hum\":%.1f, \"gas\":%d, \"light\":%.1f, \"r1\":%d, \"r2\":%d}", 
             temp, hum, gas, light, r1 ? 1 : 0, r2 ? 1 : 0);
    
    esp_mqtt_client_publish(client, TOPIC_SENSORS, payload, 0, 0, 0);
    ESP_LOGI(TAG, " Bắn lên Cloud: %s", payload);
}

// --- HÀM BẮN DỮ LIỆU THẺ RFID ---
void mqtt_publish_rfid(const uint8_t *uid) {
    if (client == NULL) return;

    char payload[64];
    snprintf(payload, sizeof(payload), "{\"uid\":\"%02X:%02X:%02X:%02X\"}", uid[0], uid[1], uid[2], uid[3]);
    
    esp_mqtt_client_publish(client, TOPIC_RFID, payload, 0, 0, 0);
    ESP_LOGI(TAG, " Bắn RFID lên Cloud: %s", payload);
}