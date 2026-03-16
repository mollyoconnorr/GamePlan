import type {ButtonProps} from '../types.ts';

export default function Button({ text, className = "", onClick, style }: ButtonProps) {
    return (
        <button
            className={`
        border rounded-sm p-1
        shadow-md
        hover:cursor-pointer
        transition-colors
        ${className}
      `}
            onClick={onClick}
            style={style}
        >
            {text}
        </button>
    );
}