#include "analog_sensors.h"
#include "esp_log.h"
#include "esp_adc/adc_cali.h"
#include "esp_adc/adc_cali_scheme.h"

static const char *TAG = "ANALOG_MGR";
static adc_oneshot_unit_handle_t adc_handle;
static adc_cali_handle_t cali_gas = NULL;
static adc_cali_handle_t cali_light = NULL;

esp_err_t analog_sensors_init(void) {
    // 1. Tạo Unit ADC1 duy nhất
    adc_oneshot_unit_init_cfg_t init_config = { .unit_id = ADC_UNIT_1 };
    ESP_ERROR_CHECK(adc_oneshot_new_unit(&init_config, &adc_handle));

    // 2. Cấu hình chung cho các Channel
    adc_oneshot_chan_cfg_t config = {
        .bitwidth = ADC_BITWIDTH_DEFAULT,
        .atten = ADC_ATTEN_DB_12,
    };
    
    // Cấu hình Gas & Ánh sáng
    ESP_ERROR_CHECK(adc_oneshot_config_channel(adc_handle, GAS_ADC_CHAN, &config));
    ESP_ERROR_CHECK(adc_oneshot_config_channel(adc_handle, LIGHT_ADC_CHAN, &config));

    // 3. Hiệu chuẩn cho từng Channel (Curve Fitting cho C6)
    adc_cali_curve_fitting_config_t cali_cfg = {
        .unit_id = ADC_UNIT_1,
        .atten = ADC_ATTEN_DB_12,
        .bitwidth = ADC_BITWIDTH_DEFAULT,
    };

    cali_cfg.chan = GAS_ADC_CHAN;
    adc_cali_create_scheme_curve_fitting(&cali_cfg, &cali_gas);

    cali_cfg.chan = LIGHT_ADC_CHAN;
    adc_cali_create_scheme_curve_fitting(&cali_cfg, &cali_light);

    ESP_LOGI(TAG, "Analog Sensors (Gas & Light) initialized successfully.");
    return ESP_OK;
}

int analog_get_gas_voltage(void) { // Trả về điện áp (mV) từ cảm biến Gas
    int raw, voltage = 0;
    adc_oneshot_read(adc_handle, GAS_ADC_CHAN, &raw);// Đọc giá trị thô từ ADC
    if (cali_gas) { // Chuyển đổi giá trị thô sang điện áp (mV) sử dụng hiệu chuẩn
        adc_cali_raw_to_voltage(cali_gas, raw, &voltage);
    }
    return voltage;
}

float analog_get_light_percentage(void) { // Trả về phần trăm ánh sáng, 0% = tối, 100% = sáng
    int raw;
    adc_oneshot_read(adc_handle, LIGHT_ADC_CHAN, &raw);
    // Công thức: 100% khi trời sáng (Raw thấp), 0% khi tối (Raw cao)
    float percentage = 100.0 - ((float)raw * 100.0 / 4095.0);
    if (percentage < 0) percentage = 0;
    if (percentage > 100) percentage = 100;
    return percentage;
}