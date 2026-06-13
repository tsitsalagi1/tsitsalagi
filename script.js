const menuButton = document.querySelector('.menu-button');
const navLinks = document.querySelector('#nav-links');

if (menuButton && navLinks) {
  menuButton.addEventListener('click', () => {
    const isOpen = navLinks.classList.toggle('open');
    menuButton.setAttribute('aria-expanded', String(isOpen));
  });
}

document.querySelectorAll('[data-copy-target]').forEach((button) => {
  button.addEventListener('click', async () => {
    const target = document.getElementById(button.dataset.copyTarget);
    if (!target) return;
    try {
      await navigator.clipboard.writeText(target.innerText);
      const original = button.innerText;
      button.innerText = 'Copied';
      setTimeout(() => { button.innerText = original; }, 1500);
    } catch (err) {
      button.innerText = 'Select text';
    }
  });
});
