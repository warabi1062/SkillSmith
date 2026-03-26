// サイドパネルの外枠レイアウト（バッジ + 閉じるボタン + bodyスロット）
interface SidePanelLayoutProps {
  badgeLabel: string;
  onClose: () => void;
  children: React.ReactNode;
}

export default function SidePanelLayout({
  badgeLabel,
  onClose,
  children,
}: SidePanelLayoutProps) {
  return (
    <div className="side-panel">
      <div className="side-panel-header">
        <span className="side-panel-badge">{badgeLabel}</span>
        <button
          type="button"
          className="side-panel-close"
          aria-label="Close"
          onClick={onClose}
        >
          x
        </button>
      </div>
      <div className="side-panel-body">{children}</div>
    </div>
  );
}
