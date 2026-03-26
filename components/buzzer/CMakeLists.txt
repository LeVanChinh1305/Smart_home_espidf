idf_component_register(
    SRCS "buzzer.c"
    INCLUDE_DIRS "include"
    REQUIRES 
        driver         # Bắt buộc có để dùng gpio
)