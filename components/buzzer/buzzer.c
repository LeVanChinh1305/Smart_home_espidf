#include "buzzer.h"
#include "driver/gpio.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "freertos/queue.h"

static int _buzzer_gpio;
static QueueHandle_t buzzer_queue = NULL;

static void buzzer_task(void *pvParameters) {
    buzzer_mode_t current_mode = BUZZER_OFF;

    while (1) {
        // Đợi lệnh từ Queue. Nếu không có lệnh mới trong 10ms, giữ nguyên mode cũ.
        xQueueReceive(buzzer_queue, &current_mode, pdMS_TO_TICKS(10));

        switch (current_mode) {
            case BUZZER_ALARM_FAST:
                gpio_set_level(_buzzer_gpio, 1);
                vTaskDelay(pdMS_TO_TICKS(100)); // Kêu nhanh 0.1s
                gpio_set_level(_buzzer_gpio, 0);
                vTaskDelay(pdMS_TO_TICKS(100));
                break;

            case BUZZER_ALARM_SLOW:
                gpio_set_level(_buzzer_gpio, 1);
                vTaskDelay(pdMS_TO_TICKS(500)); // Kêu chậm 0.5s
                gpio_set_level(_buzzer_gpio, 0);
                vTaskDelay(pdMS_TO_TICKS(500));
                break;

            default:
                gpio_set_level(_buzzer_gpio, 0);
                vTaskDelay(pdMS_TO_TICKS(100)); // Nghỉ ngơi
                break;
        }
    }
}

esp_err_t buzzer_init(int buzzer_pin) {
    _buzzer_gpio = buzzer_pin;

    gpio_reset_pin(_buzzer_gpio);
    gpio_set_direction(_buzzer_gpio, GPIO_MODE_OUTPUT);

    // Tạo Queue để nhận lệnh
    buzzer_queue = xQueueCreate(5, sizeof(buzzer_mode_t));

    // Chạy Task điều khiển còi ngầm
    xTaskCreate(buzzer_task, "buzzer_task", 2048, NULL, 5, NULL);
    
    return ESP_OK;
}

void buzzer_set_mode(buzzer_mode_t mode) {
    if (buzzer_queue != NULL) {
        // Gửi lệnh vào Queue, không đợi (0) để tránh làm chậm Task gửi
        xQueueSend(buzzer_queue, &mode, 0);
    }
}