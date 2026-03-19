import test from "node:test";
import assert from "node:assert/strict";
import { DemandValidator } from "../src/lib/llm/demand-validator";

const baseSignals = [
    { id: "s1", title: "需求A", platform: "x", category: "tech" },
    { id: "s2", title: "需求B", platform: "x", category: "tech" }
];

test("validateSignals should retry empty responses and eventually parse", async () => {
    let calls = 0;
    const client = {
        async generate() {
            calls += 1;
            if (calls < 3) return "";
            return JSON.stringify([
                { index: 0, isValid: true, reason: "ok" },
                { index: 1, isValid: false, reason: "no" }
            ]);
        }
    };

    const validator = new DemandValidator({
        client,
        validationRetryTimes: 2,
        retryDelayMs: 0,
        sleep: async () => {}
    });

    const results = await validator.validateSignals(baseSignals);
    assert.equal(calls, 3);
    assert.equal(results.length, 2);
    assert.equal(results[0].isValid, true);
    assert.equal(results[1].isValid, false);
});

test("validateSignals should fallback to non-null after retry exhaustion", async () => {
    const client = {
        async generate() {
            return "";
        }
    };

    const validator = new DemandValidator({
        client,
        validationRetryTimes: 1,
        retryDelayMs: 0,
        fallbackMode: "true",
        sleep: async () => {}
    });

    const results = await validator.validateSignals(baseSignals);
    assert.equal(results.length, 2);
    assert.equal(results[0].isValid, true);
    assert.equal(results[1].isValid, true);
});

test("updateValidationResults should honor concurrency limit", async () => {
    let inFlight = 0;
    let maxInFlight = 0;

    const signalModel = {
        async findMany() {
            return [];
        },
        async update() {
            inFlight += 1;
            maxInFlight = Math.max(maxInFlight, inFlight);
            await new Promise((resolve) => setTimeout(resolve, 20));
            inFlight -= 1;
        }
    };

    const validator = new DemandValidator({
        signalModel,
        updateBatchSize: 10,
        updateConcurrency: 2
    });

    const count = await validator.updateValidationResults(
        Array.from({ length: 10 }).map((_, i) => ({
            signalId: `id-${i}`,
            isValid: true
        }))
    );

    assert.equal(count, 10);
    assert.equal(maxInFlight, 2);
});
