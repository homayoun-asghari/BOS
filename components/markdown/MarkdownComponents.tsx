'use client';

import React from 'react';
import Image from 'next/image';

export const markdownComponents = {
  p: (props: any) => <div {...props} className="mb-4 whitespace-pre-wrap" />,
  br: () => <br className="my-2" />,
  strong: (props: any) => <strong className="font-semibold" {...props} />,
  em: (props: any) => <em className="italic" {...props} />,
  a: (props: any) => (
    <a
      {...props}
      className="text-blue-600 dark:text-blue-400 hover:underline"
      target="_blank"
      rel="noopener noreferrer"
    />
  ),
  img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => {
    if (!props.src) return null;
    
    const src = props.src.toString();
    const isExternal = src.startsWith('http');
    
    return (
      <div className="relative w-full my-4 rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
        <Image
          src={src}
          alt={props.alt || 'Image'}
          width={800}
          height={450}
          className="w-full h-auto object-contain"
          unoptimized={isExternal}
          onError={(e) => {
            const img = e.currentTarget as HTMLImageElement;
            img.outerHTML = 
              `<img src="${src}" alt="${props.alt || 'Image'}" class="w-full h-auto" />`;
          }}
        />
      </div>
    );
  },
  code: ({ className, children, ...props }: any) => {
    const isBlock = className && className.startsWith('language-');
    return isBlock ? (
      <pre className="rounded-lg overflow-hidden">
        <code className={className} {...props}>
          {children}
        </code>
      </pre>
    ) : (
      <code className="bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded text-sm" {...props}>
        {children}
      </code>
    );
  },
  table: (props: any) => (
    <div className="overflow-x-auto">
      <table className="w-full" {...props} />
    </div>
  ),
};
