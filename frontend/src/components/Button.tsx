import type {ButtonProps} from '../types.ts';

export default function Button({ text, className = "", onClick }: ButtonProps) {
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
        >
            {text}
        </button>
    );
}