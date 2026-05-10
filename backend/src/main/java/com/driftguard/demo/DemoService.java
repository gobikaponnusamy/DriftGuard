package com.driftguard.demo;

import com.driftguard.replay.ReplaySessionResponse;
import java.util.UUID;

public interface DemoService {

    DemoCaptureResponse capture(UUID serviceId);

    ReplaySessionResponse replay(UUID serviceId);

    DemoRunResponse run(UUID serviceId);
}
