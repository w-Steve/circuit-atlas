import { Component, type ReactNode } from "react";
import { createPortal } from "react-dom";
export function ErrorScreen({
  title,
  message,
}: {
  title: string;
  message: string;
}) {
  return createPortal(
    <div className="error-panel" role="alert">
      <h2>{title}</h2>
      <p>{message}</p>
      <button onClick={() => location.reload()}>重新加载场景</button>
    </div>,
    document.body,
  );
}
export class ErrorBoundary extends Component<
  { children: ReactNode },
  { error: boolean }
> {
  state = { error: false };
  static getDerivedStateFromError() {
    return { error: true };
  }
  render() {
    return this.state.error ? (
      <ErrorScreen
        title="场景加载失败"
        message="请检查网络与浏览器 WebGL 支持，然后重新加载。"
      />
    ) : (
      this.props.children
    );
  }
}
