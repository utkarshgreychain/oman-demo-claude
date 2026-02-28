import { FileText } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import type { Components } from 'react-markdown';

export const markdownComponents: Partial<Components> = {
  cite({ children, ...props }) {
    const dataIndex = (props as any)['data-index'];
    const dataFile = (props as any)['data-file'];

    if (dataIndex) {
      return (
        <a
          href={`#source-${dataIndex}`}
          className="
            inline-flex items-center justify-center
            w-[18px] h-[18px] rounded-full
            bg-primary/20 text-primary
            text-[10px] font-bold leading-none
            align-super cursor-pointer
            hover:bg-primary/30 transition-colors
            no-underline mx-0.5
          "
          title={`Source ${dataIndex}`}
          onClick={(e) => {
            e.preventDefault();
            const el = document.getElementById(`source-${dataIndex}`);
            el?.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }}
        >
          {dataIndex}
        </a>
      );
    }

    if (dataFile) {
      return (
        <span className="
          inline-flex items-center gap-1 px-1.5 py-0.5 mx-0.5
          bg-primary/10 text-primary
          text-xs font-medium rounded-md
          border border-primary/20
        ">
          <FileText size={10} />
          {children}
        </span>
      );
    }

    return <cite {...props}>{children}</cite>;
  },

  table({ children }) {
    return (
      <div className="overflow-x-auto my-3 rounded-lg border border-border">
        <table className="min-w-full text-sm">{children}</table>
      </div>
    );
  },

  thead({ children }) {
    return (
      <thead className="bg-surface-light border-b border-border">{children}</thead>
    );
  },

  th({ children }) {
    return (
      <th className="px-3 py-2 text-left text-xs font-semibold text-text-primary uppercase tracking-wider">
        {children}
      </th>
    );
  },

  td({ children }) {
    return (
      <td className="px-3 py-2 text-sm text-text-primary border-t border-border/50">
        {children}
      </td>
    );
  },

  code({ className, children, ...props }) {
    const match = /language-(\w+)/.exec(className || '');
    const codeString = String(children).replace(/\n$/, '');

    if (match) {
      return (
        <div className="relative group/code">
          <div className="flex items-center justify-between px-4 py-1.5 bg-[#282c34] border-b border-white/5 rounded-t-lg">
            <span className="text-xs text-text-secondary">{match[1]}</span>
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(codeString)}
              className="text-text-secondary hover:text-text-primary transition-colors text-xs cursor-pointer"
            >
              Copy
            </button>
          </div>
          <SyntaxHighlighter
            style={oneDark}
            language={match[1]}
            PreTag="div"
            customStyle={{
              margin: 0,
              borderRadius: '0 0 0.5rem 0.5rem',
              fontSize: '0.8rem',
            }}
          >
            {codeString}
          </SyntaxHighlighter>
        </div>
      );
    }

    return (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
};
