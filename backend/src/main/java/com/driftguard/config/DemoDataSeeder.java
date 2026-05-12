package com.driftguard.config;

import com.driftguard.common.DriftType;
import com.driftguard.auth.AppUser;
import com.driftguard.auth.AppUserRepository;
import com.driftguard.ignore.IgnoreRule;
import com.driftguard.ignore.IgnoreRuleRepository;
import com.driftguard.ignore.IgnoreRuleType;
import com.driftguard.recorder.Baseline;
import com.driftguard.recorder.BaselineRepository;
import com.driftguard.redaction.RedactionRule;
import com.driftguard.redaction.RedactionRuleRepository;
import com.driftguard.redaction.RedactionRuleType;
import com.driftguard.replay.ReplayResult;
import com.driftguard.replay.ReplayResultRepository;
import com.driftguard.replay.ReplaySession;
import com.driftguard.replay.ReplaySessionRepository;
import com.driftguard.service.RegisteredService;
import com.driftguard.service.ServiceRepository;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(prefix = "driftguard.seed", name = "enabled", havingValue = "true", matchIfMissing = true)
public class DemoDataSeeder implements CommandLineRunner {

    public static final String DEMO_API_KEY = "dg_demo_checkout_api_key";
    public static final String DEMO_EMAIL = "demo@driftguard.local";
    public static final String DEMO_PASSWORD = "driftguard";
    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final ServiceRepository serviceRepository;
    private final BaselineRepository baselineRepository;
    private final ReplaySessionRepository sessionRepository;
    private final ReplayResultRepository resultRepository;
    private final IgnoreRuleRepository ignoreRuleRepository;
    private final RedactionRuleRepository redactionRuleRepository;
    private final AppUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DemoDataSeeder(
            ServiceRepository serviceRepository,
            BaselineRepository baselineRepository,
            ReplaySessionRepository sessionRepository,
            ReplayResultRepository resultRepository,
            IgnoreRuleRepository ignoreRuleRepository,
            RedactionRuleRepository redactionRuleRepository,
            AppUserRepository userRepository,
            PasswordEncoder passwordEncoder
    ) {
        this.serviceRepository = serviceRepository;
        this.baselineRepository = baselineRepository;
        this.sessionRepository = sessionRepository;
        this.resultRepository = resultRepository;
        this.ignoreRuleRepository = ignoreRuleRepository;
        this.redactionRuleRepository = redactionRuleRepository;
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    @Transactional
    public void run(String... args) {
        if (!userRepository.existsByEmailIgnoreCase(DEMO_EMAIL)) {
            userRepository.saveAndFlush(new AppUser(
                    DEMO_EMAIL,
                    passwordEncoder.encode(DEMO_PASSWORD),
                    "Demo Admin",
                    "ADMIN"
            ));
            log.info("Seeded DriftGuard demo user: {} / {}", DEMO_EMAIL, DEMO_PASSWORD);
        }

        var existingService = serviceRepository.findByNameIgnoreCase("checkout-api");
        if (existingService.isPresent()) {
            RegisteredService service = existingService.get();
            if (baselineRepository.countByService_Id(service.getId()) == 0) {
                List<Baseline> baselines = baselineRepository.saveAllAndFlush(demoBaselines(service));
                seedReplaySession(service, baselines);
                log.info("Restored DriftGuard checkout demo baselines for existing service");
            }
            seedDefaultRedactionRules(existingService.get());
            return;
        }

        RegisteredService service = serviceRepository.saveAndFlush(new RegisteredService(
                "checkout-api",
                "http://mock-checkout-prod:8081",
                passwordEncoder.encode(DEMO_API_KEY)
        ));

        List<Baseline> baselines = baselineRepository.saveAllAndFlush(demoBaselines(service));

        seedReplaySession(service, baselines);

        ignoreRuleRepository.saveAndFlush(new IgnoreRule(service, "$.timestamp", IgnoreRuleType.IGNORE));
        seedDefaultRedactionRules(service);
        log.info("Seeded DriftGuard demo data. Demo API key: {}", DEMO_API_KEY);
    }

    private List<Baseline> demoBaselines(RegisteredService service) {
        return List.of(
                baseline(service, "GET", "/checkout/cart", 200, cart("cart_123", "99.0", "Classic Shirt"), 142),
                baseline(service, "POST", "/checkout/order", 201, order("ord_1001", "confirmed"), 310),
                baseline(service, "GET", "/checkout/price/101", 200, price("101", "49.0"), 88),
                baseline(service, "GET", "/checkout/price/202", 200, price("202", "29.0"), 91),
                baseline(service, "GET", "/checkout/cart/empty", 404, error("CART_EMPTY"), 44),
                baseline(service, "GET", "/checkout/price/303", 200, price("303", "19.0"), 88),
                baseline(service, "POST", "/checkout/apply-coupon", 200, coupon("SAVE10", "10.0"), 120),
                baseline(service, "GET", "/checkout/cart/renamed", 200, cart("cart_456", "58.0", "Sneakers"), 96),
                baseline(service, "POST", "/checkout/order/renamed", 201, order("ord_1002", "confirmed"), 277),
                baseline(service, "GET", "/checkout/summary", 200, summary("cart_789", "149.0"), 130)
        );
    }

    private void seedReplaySession(RegisteredService service, List<Baseline> baselines) {
        ReplaySession session = sessionRepository.saveAndFlush(
                new ReplaySession(service, "http://staging.checkout-api.local"));
        session.markRunning(baselines.size());
        session.markDone(6);

        resultRepository.saveAllAndFlush(List.of(
                result(session, baselines.get(0), 200, cart("cart_123", "99.0", "Classic Shirt"), 148, DriftType.NONE),
                result(session, baselines.get(1), 201, order("ord_1001", "confirmed"), 298, DriftType.NONE),
                result(session, baselines.get(2), 200, price("101", "49.0"), 90, DriftType.NONE),
                result(session, baselines.get(4), 404, error("CART_EMPTY"), 47, DriftType.NONE),
                result(session, baselines.get(3), 200, price("202", "29"), 89, DriftType.WARNING),
                result(session, baselines.get(5), 200, price("303", "19"), 85, DriftType.WARNING),
                result(session, baselines.get(6), 200, coupon("SAVE10", "10"), 125, DriftType.WARNING),
                result(session, baselines.get(7), 200, renamedCart(), 104, DriftType.BREAKING),
                result(session, baselines.get(8), 201, renamedOrder(), 289, DriftType.BREAKING),
                result(session, baselines.get(9), 200, summary("cart_789", "149.0"), 2800, DriftType.PERFORMANCE)
        ));
    }

    private void seedDefaultRedactionRules(RegisteredService service) {
        if (!redactionRuleRepository.findByService_IdOrderByCreatedAtDesc(service.getId()).isEmpty()) {
            return;
        }
        redactionRuleRepository.saveAllAndFlush(List.of(
                new RedactionRule(service, "$.customer.email", RedactionRuleType.HASH),
                new RedactionRule(service, "$.payment.cardNumber", RedactionRuleType.REDACT),
                new RedactionRule(service, "$.authorization", RedactionRuleType.REDACT)
        ));
    }

    private Baseline baseline(
            RegisteredService service,
            String method,
            String path,
            int status,
            String body,
            long responseTimeMs
    ) {
        return new Baseline(service, method, path, Map.of("content-type", "application/json"),
                null, status, Map.of("content-type", "application/json"), body, responseTimeMs);
    }

    private ReplayResult result(
            ReplaySession session,
            Baseline baseline,
            int status,
            String body,
            long responseTimeMs,
            DriftType driftType
    ) {
        return new ReplayResult(session, baseline, status, Map.of("content-type", "application/json"),
                body, responseTimeMs, driftType, summary(driftType), diffJson(driftType));
    }

    private String summary(DriftType driftType) {
        return driftType == DriftType.NONE ? "No drift detected" : driftType + " drift detected";
    }

    private Map<String, Object> diffJson(DriftType driftType) {
        return switch (driftType) {
            case NONE -> Map.of("drifts", List.of());
            case WARNING -> Map.of("drifts", List.of(Map.of(
                    "path", "$.price.amount", "type", "VALUE_CHANGED", "from", "99.0", "to", "99")));
            case BREAKING -> Map.of("drifts", List.of(fieldRemoved()));
            case PERFORMANCE -> Map.of("drifts", List.of(Map.of(
                    "path", "$.__latency_ms", "type", "LATENCY_REGRESSION", "from", 130, "to", 2800)));
        };
    }

    private Map<String, Object> fieldRemoved() {
        Map<String, Object> drift = new java.util.LinkedHashMap<>();
        drift.put("path", "$.items[0].item_name");
        drift.put("type", "FIELD_REMOVED");
        drift.put("from", "item_name");
        drift.put("to", null);
        return drift;
    }

    private String cart(String cartId, String total, String itemName) {
        return """
                {"cart_id":"%s","timestamp":"2026-05-09T10:00:00Z","total_price":%s,
                "items":[{"id":"sku_42","item_name":"%s","qty":2}]}""".formatted(cartId, total, itemName);
    }

    private String order(String orderId, String status) {
        return """
                {"order_id":"%s","timestamp":"2026-05-09T10:01:00Z","status":"%s",
                "customer":{"email":"buyer@example.com"},
                "payment":{"authorized":true,"cardNumber":"4111111111111111"}}""".formatted(orderId, status);
    }

    private String price(String id, String amount) {
        return """
                {"id":"%s","timestamp":"2026-05-09T10:02:00Z","price":{"amount":%s,"currency":"USD"}}"""
                .formatted(id, amount);
    }

    private String coupon(String code, String discount) {
        return """
                {"code":"%s","timestamp":"2026-05-09T10:03:00Z","discount":%s,"applied":true}"""
                .formatted(code, discount);
    }

    private String summary(String cartId, String total) {
        return """
                {"cart_id":"%s","timestamp":"2026-05-09T10:04:00Z","total":%s,"tax":12.4}"""
                .formatted(cartId, total);
    }

    private String error(String code) {
        return """
                {"timestamp":"2026-05-09T10:05:00Z","error":"%s","message":"Cart was not found"}"""
                .formatted(code);
    }

    private String renamedCart() {
        return """
                {"cart_id":"cart_456","timestamp":"2026-05-09T10:06:00Z","total_price":58.0,
                "items":[{"id":"sku_99","name":"Sneakers","qty":1}]}""";
    }

    private String renamedOrder() {
        return """
                {"orderId":"ord_1002","timestamp":"2026-05-09T10:07:00Z","state":"confirmed",
                "customer":{"email":"buyer@example.com"},
                "payment":{"authorized":true,"cardNumber":"4111111111111111"}}""";
    }
}
