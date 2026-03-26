#include "button.h"
#include "esp_log.h"

static const char *TAG = "BUTTON_COMPONENT";

// Khởi tạo Queue
QueueHandle_t button_event_queue = NULL;
static bool isr_service_installed = false;

// Hàm xử lý ngắt (ISR) - Chạy cực nhanh khi có tín hiệu điện áp thay đổi
static void IRAM_ATTR button_isr_handler(void* arg) {
    int pin = (int) arg; 
    // Gửi số chân pin vào hàng đợi để Task xử lý sau
    xQueueSendFromISR(button_event_queue, &pin, NULL);
}

void button_init(button_t *button) {
    gpio_num_t pin = button->pin;

    // Tạo Queue nếu chưa tồn tại (chỉ tạo 1 lần cho tất cả các nút)
    if (button_event_queue == NULL) {
        button_event_queue = xQueueCreate(10, sizeof(int));
    }

    // Cấu hình GPIO
    gpio_config_t io_conf = {
        .intr_type = GPIO_INTR_NEGEDGE,       // Ngắt khi nhấn xuống (mức 1 -> 0)
        .mode = GPIO_MODE_INPUT,
        .pin_bit_mask = (1ULL << pin),
        .pull_up_en = GPIO_PULLUP_ENABLE,     // Bật trở kéo lên nội bộ
        .pull_down_en = GPIO_PULLDOWN_DISABLE
    };
    gpio_config(&io_conf);

    // Cài đặt dịch vụ ngắt toàn cục (chỉ cài 1 lần duy nhất)
    if (!isr_service_installed) {
        if (gpio_install_isr_service(0) == ESP_OK) {
            isr_service_installed = true;
        } else {
            ESP_LOGE(TAG, "Lỗi cài đặt ISR service!");
        }
    }

    // Đăng ký hàm xử lý ngắt cho riêng chân pin này
    gpio_isr_handler_add(pin, button_isr_handler, (void*) pin);
    
    ESP_LOGI(TAG, "Đã khởi tạo xong nút nhấn tại GPIO %d", pin);
}