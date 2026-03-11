"use client";

interface RegularMessageProps {
  content: string;
}

export function RegularMessage({ content }: RegularMessageProps) {
  return (
    <div className="whitespace-pre-wrap leading-relaxed lg:leading-relaxed xl:leading-loose font-medium">
      {content}
    </div>
  );
}