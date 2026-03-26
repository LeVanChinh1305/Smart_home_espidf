#ifndef RELAY_H
#define RELAY_H

#include "driver/gpio.h"

// Định nghĩa lại chân theo sơ đồ mới của bạn
#define RELAY_CH1_PIN 12
#define RELAY_CH2_PIN 13

void relay_init(void);
void relay_ch1_set(bool state);
void relay_ch2_set(bool state);

#endif