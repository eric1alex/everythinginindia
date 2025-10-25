document.addEventListener("DOMContentLoaded", () => {
  // Select all cards with the new class name
  const cards = document.querySelectorAll(".recommendation-card");

  if (cards.length === 0) return; // No cards on this page, do nothing

  // Set up the observer to watch for cards entering the screen
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        // When a card is intersecting (visible)
        if (entry.isIntersecting) {
          // Add a slight delay based on its order, then add the animation class
          entry.target.style.animationDelay = `${entry.target.dataset.index * 100}ms`;
          entry.target.classList.add("fade-in-animation"); // A more specific class name
          
          // Stop observing this card once animated
          observer.unobserve(entry.target);
        }
      });
    },
    {
      threshold: 0.1, // Trigger when 10% of the card is visible
    }
  );

  // Observe each card and assign it an index for the animation delay
  cards.forEach((card, index) => {
    card.dataset.index = index;
    observer.observe(card);
  });
});

// We also need to add the "fade-in-animation" class to the CSS.
// Please add this to your public/styles/global.css file,
// replacing the old @keyframes.

/* ADD THIS TO public/styles/global.css 
  (You can put it at the end)
*/

/* This sets the initial state for the animation 
  (it's invisible and moved down)
*/
.recommendation-card {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.5s ease-out, transform 0.5s ease-out;
}

/* This class is added by the script to trigger the animation 
*/
.recommendation-card.fade-in-animation {
  opacity: 1;
  transform: translateY(0);
}

/* We no longer need the @keyframes rule, 
  so you can delete this from your CSS:
  
  @keyframes cardFadeIn {
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
*/

