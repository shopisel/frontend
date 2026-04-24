import React, { useEffect, useMemo, useRef, useState } from 'react'

const ERROR_IMG_SRC =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iODgiIGhlaWdodD0iODgiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgc3Ryb2tlPSIjMDAwIiBzdHJva2UtbGluZWpvaW49InJvdW5kIiBvcGFjaXR5PSIuMyIgZmlsbD0ibm9uZSIgc3Ryb2tlLXdpZHRoPSIzLjciPjxyZWN0IHg9IjE2IiB5PSIxNiIgd2lkdGg9IjU2IiBoZWlnaHQ9IjU2IiByeD0iNiIvPjxwYXRoIGQ9Im0xNiA1OCAxNi0xOCAzMiAzMiIvPjxjaXJjbGUgY3g9IjUzIiBjeT0iMzUiIHI9IjciLz48L3N2Zz4KCg=='

export function ImageWithFallback(props: React.ImgHTMLAttributes<HTMLImageElement>) {
  const [didError, setDidError] = useState(false)
  const [isNearViewport, setIsNearViewport] = useState(false)
  const wrapperRef = useRef<HTMLSpanElement | null>(null)

  const handleError = () => {
    setDidError(true)
  }

  const { src, alt, style, className, loading = 'lazy', decoding = 'async', fetchPriority = 'low', ...rest } = props
  const shouldLoad = useMemo(() => loading === 'eager' || isNearViewport, [isNearViewport, loading])

  useEffect(() => {
    setDidError(false)
  }, [src])

  useEffect(() => {
    if (loading === 'eager' || isNearViewport) return;
    const element = wrapperRef.current;
    if (!element || typeof window === 'undefined' || !('IntersectionObserver' in window)) {
      setIsNearViewport(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: '220px 0px' },
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, [isNearViewport, loading]);

  return didError ? (
    <span ref={wrapperRef} className="inline-block align-middle">
      <div
        className={`inline-block bg-gray-100 text-center align-middle ${className ?? ''}`}
        style={style}
      >
        <div className="flex items-center justify-center w-full h-full">
          {shouldLoad ? (
            <img
              src={ERROR_IMG_SRC}
              alt="Error loading image"
              {...rest}
              loading={loading}
              decoding={decoding}
              fetchPriority={fetchPriority}
              data-original-url={src}
            />
          ) : null}
        </div>
      </div>
    </span>
  ) : (
    <span ref={wrapperRef} className="inline-block align-middle">
      <img
        src={shouldLoad ? src : undefined}
        alt={alt}
        className={className}
        style={style}
        {...rest}
        loading={loading}
        decoding={decoding}
        fetchPriority={fetchPriority}
        onError={handleError}
      />
    </span>
  )
}
