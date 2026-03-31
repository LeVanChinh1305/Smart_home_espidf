#include "button.h"
#include "esp_log.h"

static const char *TAG = "BUTTON_COMPONENT";

// Khởi tạo Queue
QueueHandle_t button_event_queue = NULL;
static bool isr_service_installed = false;

// Hàm xử lý ngắt (ISR) - Chạy cực nhanh khi có tín hiệu điện áp thay đổi
// Khi nút được nhấn, chân GPIO sẽ chuyển từ mức 1 (do pull-up) xuống mức 0, kích hoạt ngắt và gọi hàm này
// để hàm này hoạt động, ta cần phải cấu hình GPIO với chế độ ngắt và đăng ký hàm này làm handler cho ngắt đó
// IRAM_ATTR là một chỉ thị ép trình biên dịch phải lưu hàm này vào trong RAM nội (Internal RAM) 
    //của ESP32 thay vì để ngoài bộ nhớ Flash (ổ cứng). -> Nhờ nằm trong RAM, khi có người bấm nút, 
    //CPU có thể lôi hàm này ra chạy ngay lập tức với độ trễ gần như bằng 0 (Microsecond), không phải tốn thời gian "đọc ổ cứng" nữa
static void IRAM_ATTR button_isr_handler(void* arg) {
    //Trong hàm ngắt (ISR), code phải càng ngắn càng tốt và tuyệt đối không được dùng các lệnh chờ đợi (như vTaskDelay hay lệnh in log ESP_LOGI).
    int pin = (int) arg; // Giá trị này được TRUYỀN VÀO (thông qua con trỏ arg) khi đăng ký ngắt ở hàm button_init. 
    // Ví dụ, nếu ta đăng ký ngắt cho GPIO 1, thì arg sẽ là 1, và khi ngắt xảy ra, pin sẽ được gán giá trị 1.
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
    // void* arg ở đây là con trỏ được ép kiểu từ số chân pin. Khi ngắt xảy ra, hàm button_isr_handler sẽ nhận được số chân này để biết nút nào đã được nhấn.
    // khi nào chân số pin_num có thay đổi điện áp, tự động gọi hàm button_isr_handler ra chạy, và cầm theo con số pin này nhét vào tham số arg của hàm đó".
    
    ESP_LOGI(TAG, "Đã khởi tạo xong nút nhấn tại GPIO %d", pin);
}