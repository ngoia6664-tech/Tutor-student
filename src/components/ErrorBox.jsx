import Icon from './Icon.jsx'
/** @param {{ message?: string | null, onRetry?: () => void, children?: import('react').ReactNode }} props */
export default function ErrorBox({ message, onRetry, children }) {
  if (!message) return null
  return (
    <div className="alert alert-error" role="alert">
      <strong>Có lỗi:</strong> {message}
      {(onRetry || children) && (
        <div className="alert-actions">
          {onRetry && (
            <button type="button" className="btn btn-small" onClick={onRetry}>
              <Icon name="refresh" />
              Thử lại
            </button>
          )}
          {children}
        </div>
      )}
    </div>
  )
}
