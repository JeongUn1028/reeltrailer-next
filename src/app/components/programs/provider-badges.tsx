import type { Provider } from "@/app/types/types";
import { normalizeProviderName } from "@/app/lib/normalizeProviderName";
import styles from "./provider-badges.module.css";

export interface ProviderBadge {
  short: string;
  label: string;
  className: string;
}

const BADGES: Record<string, ProviderBadge> = {
  netflix: { short: "N", label: "Netflix", className: styles.netflix },
  "disney plus": { short: "D+", label: "Disney+", className: styles.disney },
  tving: { short: "T", label: "Tving", className: styles.tving },
  watcha: { short: "W", label: "Watcha", className: styles.watcha },
  wavve: { short: "Wv", label: "Wavve", className: styles.wavve },
};

//* 제공자 이름 → 배지 정보 (지원 OTT가 아니면 null)
export function providerBadge(providerName: string): ProviderBadge | null {
  const key = normalizeProviderName(providerName).trim().toLowerCase().replace("+", " plus");
  return BADGES[key] ?? null;
}

const MAX_BADGES = 3;

//* 카드 포스터 위에 겹쳐 보여주는 OTT 약어 배지
export default function ProviderBadges({ providers }: { providers: Provider[] }) {
  const seen = new Set<string>();
  const badges: ProviderBadge[] = [];
  for (const provider of providers) {
    const badge = providerBadge(provider.providerName);
    if (badge && !seen.has(badge.label)) {
      seen.add(badge.label);
      badges.push(badge);
    }
  }
  if (badges.length === 0) return null;

  const visible = badges.slice(0, MAX_BADGES);
  const rest = badges.length - visible.length;

  return (
    <ul className={styles.list} aria-label={`시청 가능한 OTT: ${badges.map((b) => b.label).join(", ")}`}>
      {visible.map((badge) => (
        <li key={badge.label} className={`${styles.badge} ${badge.className}`} title={badge.label}>
          {badge.short}
        </li>
      ))}
      {rest > 0 && <li className={`${styles.badge} ${styles.more}`}>+{rest}</li>}
    </ul>
  );
}
