idf_component_register(
    SRCS "smart_home_project.c"
    INCLUDE_DIRS "."
    PRIV_REQUIRES 
                     # Bắt buộc có để dùng gas_sensor
        buzzer          # Bắt buộc có để dùng buzzer
        analog_sensors
        relay
        button
)
