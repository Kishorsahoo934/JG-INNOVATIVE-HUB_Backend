const url = 'https://res.cloudinary.com/demo/raw/upload/v12345/test.pdf';
const newUrl = url.replace('/upload/', '/upload/fl_attachment/');
console.log(newUrl);
