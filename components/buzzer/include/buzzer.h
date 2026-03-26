#ifndef BUZZER_H
#define BUZZER_H

#include "esp_err.h"

typedef enum {
    BUZZER_OFF = 0,
    BUZZER_ALARM_FAST,  // Kêu dồn dập khi Gas nặng
    BUZZER_ALARM_SLOW   // Kêu chậm khi Gas nhẹ
} buzzer_mode_t;

// Khởi tạo còi với 1 tham số duy nhất là chân GPIO
esp_err_t buzzer_init(int buzzer_gpio);

// Hàm để các Task khác (như Task Gas) ra lệnh cho còi
void buzzer_set_mode(buzzer_mode_t mode);

#endif