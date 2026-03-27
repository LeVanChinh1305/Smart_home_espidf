#ifndef MQTT_MANAGER_H
#define MQTT_MANAGER_H

#include <stdint.h>

// Hàm khởi động MQTT Client (Gọi 1 lần ở app_main)
void mqtt_app_start(void);

// Hàm bắn dữ liệu cảm biến lên Server
void mqtt_publish_sensor_data(float temp, float hum, int gas, float light, bool r1, bool r2);

// Hàm bắn mã thẻ RFID khi có người quẹt thẻ
void mqtt_publish_rfid(const uint8_t *uid);

#endif