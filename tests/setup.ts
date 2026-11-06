// jsdom не реализует прокрутку окна: заглушаем, чтобы не засорять вывод тестов.
if (typeof window !== 'undefined') {
  window.scrollTo = (() => {}) as typeof window.scrollTo;
}
