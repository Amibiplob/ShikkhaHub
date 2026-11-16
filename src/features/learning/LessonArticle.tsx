import ReactMarkdown from "react-markdown";
/** Lesson title is h2; authored Markdown starts below it in the page outline. */
export default function LessonArticle({ content }: { content: string }) {
  return (
    <ReactMarkdown
      components={{
        h1: ({ children }) => (
          <h3 className="mb-3 text-xl font-semibold">{children}</h3>
        ),
        h2: ({ children }) => (
          <h4 className="my-3 text-lg font-semibold">{children}</h4>
        ),
        h3: ({ children }) => (
          <h5 className="my-3 font-semibold">{children}</h5>
        ),
        h4: ({ children }) => (
          <h6 className="my-3 font-semibold">{children}</h6>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
