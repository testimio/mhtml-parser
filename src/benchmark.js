const Processor = require('./processor');

/* eslint-disable */
(async () => {
  let start = Date.now();
  for (let i = 0; i < 1000; i++) {
    await Processor.convert('./demos/example.com.mhtml');
  }
  console.log('Converted example.com 1000 times. Average time: ', (Date.now() - start) / 100);

  start = Date.now();
  for (let i = 0; i < 100; i++) {
    await Processor.convert('./demos/nested-iframe.mhtml');
  }
  console.log('Converted three level nested iframe 100 times. Average time: ', (Date.now() - start) / 100);

  start = Date.now();

  for (let i = 0; i < 30; i++) {
    await Processor.convert('./demos/one.mhtml');
  }
  console.log('Converted github 30 times. Average time: ', (Date.now() - start) / 30);


  start = Date.now();
  for (let i = 0; i < 100; i++) {
    await Processor.convert('./demos/two.mhtml');
  }
  console.log('Converted mdn 100 times. Average time (ms): ', (Date.now() - start) / 100);
})();
