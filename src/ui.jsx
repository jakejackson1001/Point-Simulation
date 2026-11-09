import React, { useEffect, useRef, useId } from "react";
import { X, ArrowUp, ArrowDown } from "lucide-react";
export function Button({ children, icon: Icon, className = "", ...props }) {
  return (
    <button className={`button ${className}`} {...props}>
      {Icon && <Icon size={17} aria-hidden="true" />}
      {children}
    </button>
  );
}
export function IconButton({ icon: Icon, label, ...props }) {
  return (
    <button className="icon-button" title={label} aria-label={label} {...props}>
      <Icon size={17} aria-hidden="true" />
    </button>
  );
}
export function Field({ label, children, ...props }) {
  const inputId = useId();
  const native =
    !children || ["input", "select", "textarea"].includes(children.type);
  return (
    <div
      className="field"
      role={native ? undefined : "group"}
      aria-label={native ? undefined : label}
    >
      {native ? <label htmlFor={inputId}>{label}</label> : <span>{label}</span>}
      {children ? (
        native ? (
          React.cloneElement(children, { id: inputId })
        ) : (
          children
        )
      ) : (
        <input id={inputId} {...props} />
      )}
    </div>
  );
}
export function Empty({ title, children, action }) {
  return (
    <div className="empty">
      <div className="empty-mark">↗</div>
      <h3>{title}</h3>
      <p>{children}</p>
      {action}
    </div>
  );
}
export function Order({ index, total, onMove, label }) {
  return (
    <div className="order">
      <IconButton
        icon={ArrowUp}
        label={`Move ${label} up`}
        disabled={index === 0}
        onClick={() => onMove(-1)}
      />
      <IconButton
        icon={ArrowDown}
        label={`Move ${label} down`}
        disabled={index === total - 1}
        onClick={() => onMove(1)}
      />
    </div>
  );
}
export function Modal({ title, children, onClose, wide = false }) {
  const ref = useRef();
  useEffect(() => {
    const prior = document.activeElement;
    const d = ref.current;
    d.showModal();
    return () => {
      d.close();
      prior?.focus();
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className={`modal ${wide ? "wide" : ""}`}
      onCancel={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <header>
        <h2>{title}</h2>
        <IconButton icon={X} label="Close dialog" onClick={onClose} />
      </header>
      {children}
    </dialog>
  );
}
export function Confirm({
  title,
  children,
  onConfirm,
  onClose,
  label = "Confirm",
}) {
  return (
    <Modal title={title} onClose={onClose}>
      <p className="muted">{children}</p>
      <div className="actions end">
        <Button onClick={onClose}>Cancel</Button>
        <Button
          className="danger"
          onClick={() => {
            onConfirm();
            onClose();
          }}
        >
          {label}
        </Button>
      </div>
    </Modal>
  );
}
export function download(name, content, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
