package com.driftguard.demo;

import com.driftguard.config.AppProperties;
import com.driftguard.recorder.Baseline;
import com.driftguard.recorder.BaselineRepository;
import com.driftguard.replay.ReplayService;
import com.driftguard.replay.TriggerReplayRequest;
import com.driftguard.service.RegisteredService;
import com.driftguard.service.ServiceRepository;
import com.driftguard.common.ResourceNotFoundException;
import java.net.URI;
import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import org.springframework.http.HttpMethod;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.reactive.function.client.WebClient.RequestHeadersSpec;
import org.springframework.web.reactive.function.client.WebClient.RequestBodySpec;
import org.springframework.web.reactive.function.client.WebClient;

@Service
public class DemoServiceImpl implements DemoService {

    private final ServiceRepository serviceRepository;
    private final BaselineRepository baselineRepository;
    private final ReplayService replayService;
    private final WebClient.Builder webClientBuilder;
    private final AppProperties appProperties;

    public DemoServiceImpl(
            ServiceRepository serviceRepository,
            BaselineRepository baselineRepository,
            ReplayService replayService,
            WebClient.Builder webClientBuilder,
            AppProperties appProperties
    ) {
        this.serviceRepository = serviceRepository;
        this.baselineRepository = baselineRepository;
        this.replayService = replayService;
        this.webClientBuilder = webClientBuilder;
        this.appProperties = appProperties;
    }

    @Override
    @Transactional
    public DemoCaptureResponse capture(UUID serviceId) {
        RegisteredService service = serviceRepository.findById(serviceId)
                .orElseThrow(() -> new ResourceNotFoundException("Service not found: " + serviceId));
        List<DemoRequest> requests = List.of(
                new DemoRequest(HttpMethod.GET, "/checkout/cart", null),
                new DemoRequest(HttpMethod.POST, "/checkout/order", "{\"cartId\":\"cart_123\"}"),
                new DemoRequest(HttpMethod.GET, "/checkout/price/101", null),
                new DemoRequest(HttpMethod.GET, "/checkout/price/202", null),
                new DemoRequest(HttpMethod.GET, "/checkout/cart/empty", null),
                new DemoRequest(HttpMethod.GET, "/checkout/price/303", null),
                new DemoRequest(HttpMethod.POST, "/checkout/apply-coupon", "{\"code\":\"SAVE10\"}"),
                new DemoRequest(HttpMethod.GET, "/checkout/summary", null)
        );

        List<Baseline> baselines = requests.stream()
                .map(request -> captureOne(service, request))
                .toList();
        baselineRepository.saveAllAndFlush(baselines);
        return new DemoCaptureResponse(serviceId, baselines.size(), productionBaseUrl(service));
    }

    @Override
    public com.driftguard.replay.ReplaySessionResponse replay(UUID serviceId) {
        return replayService.trigger(new TriggerReplayRequest(serviceId, appProperties.demoStagingUrl()));
    }

    @Override
    @Transactional
    public DemoRunResponse run(UUID serviceId) {
        DemoCaptureResponse capture = capture(serviceId);
        com.driftguard.replay.ReplaySessionResponse session = replay(serviceId);
        return new DemoRunResponse(
                serviceId,
                capture.capturedCount(),
                session.id(),
                session.stagingUrl()
        );
    }

    private Baseline captureOne(RegisteredService service, DemoRequest request) {
        long started = System.nanoTime();
        RequestBodySpec spec = webClientBuilder.build()
                .method(request.method())
                .uri(URI.create(productionBaseUrl(service) + request.path()))
                .headers(headers -> headers.set("content-type", "application/json"));
        RequestHeadersSpec<?> requestSpec = request.body() == null ? spec : spec.bodyValue(request.body());
        CapturedResponse response = requestSpec.exchangeToMono(clientResponse -> clientResponse.bodyToMono(String.class)
                        .defaultIfEmpty("")
                        .map(body -> new CapturedResponse(
                                clientResponse.statusCode().value(),
                                flattenHeaders(clientResponse.headers().asHttpHeaders()),
                                body
                        )))
                .block(Duration.ofSeconds(10));

        long elapsed = Duration.ofNanos(System.nanoTime() - started).toMillis();
        return new Baseline(service, request.method().name(), request.path(),
                Map.of("content-type", "application/json"), request.body(),
                response.status(), response.headers(), response.body(), elapsed);
    }

    private Map<String, Object> flattenHeaders(org.springframework.http.HttpHeaders headers) {
        Map<String, Object> result = new LinkedHashMap<>();
        headers.forEach((key, values) -> result.put(key, values.size() == 1 ? values.getFirst() : values));
        return result;
    }

    private String productionBaseUrl(RegisteredService service) {
        if (service.getBaseUrl().contains("checkout-api.prod.local")) {
            return "http://mock-checkout-prod:8081";
        }
        return service.getBaseUrl();
    }

    private record DemoRequest(HttpMethod method, String path, String body) {
    }

    private record CapturedResponse(int status, Map<String, Object> headers, String body) {
    }
}
