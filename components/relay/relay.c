#include "relay.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"

void relay_init(void) {
    gpio_config_t io_conf = {
        .pin_bit_mask = (1ULL << RELAY_CH1_PIN) | (1ULL << RELAY_CH2_PIN) | (1ULL << RELAY_CH3_PIN) | (1ULL << RELAY_CH4_PIN),
        .mode = GPIO_MODE_OUTPUT,
        .pull_up_en = GPIO_PULLUP_DISABLE,
        .pull_down_en = GPIO_PULLDOWN_DISABLE,
        .intr_type = GPIO_INTR_DISABLE,
    };
    gpio_config(&io_conf);

    // Tắt Relay (Mức 1 là Tắt với module Active Low)
    gpio_set_level(RELAY_CH1_PIN, 1);
    vTaskDelay(pdMS_TO_TICKS(100)); // Trễ nhẹ để ổn định nguồn
    gpio_set_level(RELAY_CH2_PIN, 1);
    vTaskDelay(pdMS_TO_TICKS(100));
    gpio_set_level(RELAY_CH3_PIN, 1);
    vTaskDelay(pdMS_TO_TICKS(100));
    gpio_set_level(RELAY_CH4_PIN, 1);
    vTaskDelay(pdMS_TO_TICKS(100));
}

void relay_ch1_set(bool state) {
    // state = true -> bật (mức 0), state = false -> tắt (mức 1)
    gpio_set_level(RELAY_CH1_PIN, state ? 0 : 1);
}

void relay_ch2_set(bool state) {
    gpio_set_level(RELAY_CH2_PIN, state ? 0 : 1);
}
void relay_ch3_set(bool state) {
    gpio_set_level(RELAY_CH3_PIN, state ? 0 : 1);
}
void relay_ch4_set(bool state) {
    gpio_set_level(RELAY_CH4_PIN, state ? 0 : 1);
}