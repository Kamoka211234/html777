
export const createRipple = (event: any) => {
  // If called from a global listener, currentTarget might be window, so fallback to target or closest button
  let button = event.currentTarget;
  if (button === window || button === document) {
      button = (event.target as HTMLElement).closest('button');
  }
  
  if (!button || typeof button.getBoundingClientRect !== 'function') return;
  
  const circle = document.createElement("span");
  const diameter = Math.max(button.clientWidth, button.clientHeight);
  const radius = diameter / 2;

  circle.style.width = circle.style.height = `${diameter}px`;
  circle.style.left = `${event.clientX - button.getBoundingClientRect().left - radius}px`;
  circle.style.top = `${event.clientY - button.getBoundingClientRect().top - radius}px`;
  circle.classList.add("ripple-effect");

  const ripple = button.getElementsByClassName("ripple-effect")[0];

  if (ripple) {
    ripple.remove();
  }

  button.appendChild(circle);
};
