import { useEffect, useRef, useState } from 'react';

function useIntersectionObserver(options = {}) {
  const elementRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      // Once an element becomes visible, keep it visible
      if (entry.isIntersecting) {
        setIsVisible(true);
      }
    }, { 
      threshold: 0.2, // Increase threshold - element must be 20% visible
      rootMargin: '0px 0px -100px 0px', // Trigger earlier (100px before element enters viewport)
      ...options 
    });

    const currentElement = elementRef.current;
    if (currentElement) {
      observer.observe(currentElement);
    }

    return () => {
      if (currentElement) {
        observer.unobserve(currentElement);
      }
    };
  }, [options]);

  return [elementRef, isVisible];
}

export default useIntersectionObserver;