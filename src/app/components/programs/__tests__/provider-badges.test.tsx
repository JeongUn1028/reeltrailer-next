import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import ProviderBadges, { providerBadge } from "../provider-badges";

const p = (id: number, providerName: string) => ({ id, providerName, logoPath: null });

describe("providerBadge", () => {
  it("지원 OTT는 약어와 색상을 돌려주고, 광고형 Netflix는 Netflix로 합친다", () => {
    expect(providerBadge("Netflix")).toMatchObject({ short: "N", label: "Netflix" });
    expect(providerBadge("Netflix Standard with Ads")).toMatchObject({ short: "N", label: "Netflix" });
    expect(providerBadge("Disney Plus")).toMatchObject({ short: "D+", label: "Disney+" });
    expect(providerBadge("TVING")).toMatchObject({ short: "T", label: "Tving" });
    expect(providerBadge("wavve")).toMatchObject({ short: "Wv", label: "Wavve" });
    expect(providerBadge("Watcha")).toMatchObject({ short: "W", label: "Watcha" });
  });

  it("모르는 제공자는 null", () => {
    expect(providerBadge("Apple TV Plus")).toBeNull();
  });
});

describe("ProviderBadges", () => {
  it("중복을 합쳐 최대 3개까지 표시하고 나머지는 +n", () => {
    render(
      <ProviderBadges
        providers={[p(8, "Netflix"), p(1796, "Netflix Standard with Ads"), p(337, "Disney Plus"), p(1883, "TVING"), p(356, "wavve")]}
      />,
    );
    const list = screen.getByRole("list", { name: "시청 가능한 OTT: Netflix, Disney+, Tving, Wavve" });
    expect(list.querySelectorAll("li")).toHaveLength(4); // 3개 + "+1"
    expect(screen.getByText("N")).toBeInTheDocument();
    expect(screen.getByText("D+")).toBeInTheDocument();
    expect(screen.getByText("T")).toBeInTheDocument();
    expect(screen.getByText("+1")).toBeInTheDocument();
  });

  it("지원 OTT가 없으면 렌더링하지 않는다", () => {
    const { container } = render(<ProviderBadges providers={[p(1, "Apple TV Plus")]} />);
    expect(container).toBeEmptyDOMElement();
  });
});
