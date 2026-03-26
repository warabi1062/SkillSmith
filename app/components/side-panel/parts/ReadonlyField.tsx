// ラベル + read-only値の表示
interface ReadonlyFieldProps {
  label: string;
  value: string;
}

export default function ReadonlyField({ label, value }: ReadonlyFieldProps) {
  return (
    <div className="form-group">
      <label>{label}</label>
      <div className="side-panel-readonly">{value}</div>
    </div>
  );
}
