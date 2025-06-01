interface DeviceState {
    soc?: string;
    totalInput?: number;
    totalOutput?: number;
    acOutput: boolean;
    dcOutput: boolean;
    inverter: boolean;
    ledState: boolean;
    [key: string]: string | number | boolean | undefined;
}