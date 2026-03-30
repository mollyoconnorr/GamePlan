import type {ButtonProps} from '../types.ts';

export default function Button({ text, className = "", onClick, style, disabled = false }: ButtonProps) {
    return (
        <button
            className={`
        border rounded-sm p-1
        shadow-md
        hover:cursor-pointer
        transition-colors
        disabled:cursor-not-allowed disabled:opacity-50
        ${className}
      `}
            onClick={onClick}
            disabled={disabled}
            style={style}
        >
            {text}
        </button>
    );
}
