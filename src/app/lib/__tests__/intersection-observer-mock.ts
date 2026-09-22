import { vi } from "vitest";

//* 테스트에서 IntersectionObserver를 수동으로 트리거하기 위한 mock
export function installIntersectionObserverMock() {
  const observers = new Set<{
    callback: IntersectionObserverCallback;
    elements: Set<Element>;
    instance: IntersectionObserver;
  }>();

  class MockIntersectionObserver implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = "";
    readonly thresholds = [];
    private record: { callback: IntersectionObserverCallback; elements: Set<Element>; instance: IntersectionObserver };

    constructor(callback: IntersectionObserverCallback) {
      this.record = { callback, elements: new Set(), instance: this };
      observers.add(this.record);
    }
    observe = (el: Element) => { this.record.elements.add(el); };
    unobserve = (el: Element) => { this.record.elements.delete(el); };
    disconnect = () => { observers.delete(this.record); };
    takeRecords = () => [];
  }

  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);

  return {
    //* 관찰 중인 모든 요소를 "보임" 상태로 만든다
    intersectAll(isIntersecting = true) {
      for (const record of observers) {
        const entries = Array.from(record.elements).map(
          (target) => ({ target, isIntersecting }) as IntersectionObserverEntry,
        );
        if (entries.length > 0) record.callback(entries, record.instance);
      }
    },
    get observedCount() {
      let n = 0;
      for (const record of observers) n += record.elements.size;
      return n;
    },
  };
}
