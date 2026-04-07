#ifndef ANALOG_SENSORS_H
#define ANALOG_SENSORS_H

#include "esp_adc/adc_oneshot.h"
#include "esp_err.h"

// Định nghĩa các Channel dựa trên GPIO (Dành cho ESP32-C6 ADC1)
#define GAS_ADC_CHAN      ADC_CHANNEL_4 // GPIO 4
#define LIGHT_ADC_CHAN    ADC_CHANNEL_1 // GPIO 1 (Dùng 1 để tránh trùng SPI)

// Khởi tạo chung cho cả 2 cảm biến
esp_err_t analog_sensors_init(void);

// Đọc điện áp Gas (mV)
int analog_get_gas_voltage(void);

// Đọc phần trăm Ánh sáng (%)
float analog_get_light_percentage(void);

#endif