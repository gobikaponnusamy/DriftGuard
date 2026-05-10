package com.driftguard.replay;

import com.driftguard.recorder.Baseline;

public interface ReplayHttpClient {

    ReplayedHttpResponse replay(String stagingUrl, Baseline baseline);
}
