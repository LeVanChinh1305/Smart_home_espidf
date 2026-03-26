#ifndef BUTTON_H
#define BUTTON_H

#include "driver/gpio.h"
#include "freertos/FreeRTOS.h"
#include "freertos/queue.h"

// Định nghĩa struct cho nút bấm
typedef struct {
    gpio_num_t pin; // Chân GPIO của nút bấm
} button_t;

// Khai báo Queue dùng chung để đẩy sự kiện nút nhấn về Main
// Task xử lý sẽ đợi ở Queue này
extern QueueHandle_t button_event_queue;

/**
 * @brief Khởi tạo GPIO cho nút bấm, bật trở kéo lên và thiết lập ngắt (Interrupt)
 * @param button Con trỏ tới struct chứa thông tin chân pin
 */
void button_init(button_t *button);

#endif