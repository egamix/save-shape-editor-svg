import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';
import {
  ShapeEditor,
  ImageLayer,
  DrawLayer,
  SelectionLayer,
  wrapShape,
} from 'react-shape-editor';

function arrayReplace(arr, index, item) {
  return [
    ...arr.slice(0, index),
    ...(Array.isArray(item) ? item : [item]),
    ...arr.slice(index + 1),
  ];
}

const RectShape = wrapShape(({ width, height }) => (
  <rect width={width} height={height} fill="rgba(0,0,255,0.5)" />
));

let idIterator = 1;
const Editor = () => {
  const [items, setItems] = useState([
    { id: '1', x: 20, y: 120, width: 145, height: 140 },
    { id: '2', x: 15, y: 0, width: 150, height: 95 },
  ]);

  const [{ vectorHeight, vectorWidth }, setVectorDimensions] = useState({
    vectorHeight: 0,
    vectorWidth: 0,
  });
  const [selectedShapeIds, setSelectedShapeIds] = useState([]);

  const shapes = items.map((item, index) => {
    const { id, height, width, x, y } = item;
    return (
      <RectShape
        key={id}
        active={selectedShapeIds.indexOf(id) >= 0}
        shapeId={id}
        shapeIndex={index}
        height={height}
        width={width}
        x={x}
        y={y}
        onChange={(newRect) => {
          setItems((currentItems) =>
            arrayReplace(currentItems, index, {
              ...item,
              ...newRect,
            })
          );
        }}
        onDelete={() => {
          setItems((currentItems) => arrayReplace(currentItems, index, []));
        }}
      />
    );
  });

  const dataURItoBlob = function (dataURI) {
    var binary = atob(dataURI.split(',')[1]);
    var array = [];
    for (var i = 0; i < binary.length; i++) {
      array.push(binary.charCodeAt(i));
    }
    return new Blob([new Uint8Array(array)], { type: 'image/jpeg' });
  };

  const a = useRef();
  function triggerDownload(imgURI) {
    var evt = new MouseEvent('click', {
      view: window,
      bubbles: false,
      cancelable: true,
    });

    a.current.setAttribute('download', 'MY_COOL_IMAGE.png');
    a.current.setAttribute('href', imgURI);
    a.current.setAttribute('target', '_blank');

    a.current.dispatchEvent(evt);
  }

  const toDataURL = (url) =>
    fetch(url)
      .then((response) => response.blob())
      .then(
        (blob) =>
          new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
          })
      );

  const [url, setURL] = useState('');
  useEffect(() => {
    toDataURL('https://picsum.photos/600/600').then((dataUrl) => {
      setURL(dataUrl);
    });
  }, []);

  const svgRef = useRef();
  const canvasRef = useRef();
  const outputRef = useRef();

  const GenerateImageBlobFromSVG = (newWidth, mimetype) => {
    return new Promise(function (resolve, reject) {
      const data = new XMLSerializer().serializeToString(svgRef.current);
      var ctx = canvasRef.current.getContext('2d');
      console.log(data);
      var DOMURL = window.URL || window.webkitURL || window;
      var img = new Image();
      var svgBlob = new Blob([data], { type: 'image/svg+xml;charset=utf-8' });
      var dataURL = DOMURL.createObjectURL(svgBlob);

      // let dataURL =
      // 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(data);

      img.onload = function () {
        let originalWidth = img.width;
        let originalHeight = img.height;

        // Declare the new width of the image
        // And calculate the new height to preserve the aspect ratio
        img.width = newWidth;
        img.height = (originalHeight / originalWidth) * newWidth;

        // Set the dimensions of the canvas to the new dimensions of the image
        canvasRef.current.width = originalWidth;
        canvasRef.current.height = originalHeight;
        // Render image in Canvas
        ctx.drawImage(img, 0, 0, originalWidth, originalHeight);
        // ctx.drawImage(img, 0, 0);
        // DOMURL.revokeObjectURL(url);

        canvasRef.current.toBlob(
          function (blob) {
            resolve(blob);
          },
          'image/png',
          1
        );

        // var imgURI = canvasRef.current
        //   .toDataURL('image/png')
        //   .replace('image/png', 'image/octet-stream');

        // triggerDownload(imgURI);
      };

      img.src = dataURL;
    });
  };

  const saveSvg = async () => {
    const blob = await GenerateImageBlobFromSVG(500, 'image/png');
    let fileURL = window.URL.createObjectURL(blob);
    outputRef.current.src = fileURL;
  };

  return (
    <div>
      Click and drag to draw shapes (or shift-click to select)
      <button onClick={saveSvg}>Click me</button>
      <ShapeEditor
        ref={svgRef}
        vectorWidth={vectorWidth}
        vectorHeight={vectorHeight}
      >
        <ImageLayer
          // Photo by Sarah Gualtieri on Unsplash
          src={url}
          onLoad={({ naturalWidth, naturalHeight }) => {
            setVectorDimensions({
              vectorWidth: naturalWidth,
              vectorHeight: naturalHeight,
            });
          }}
        />
        <SelectionLayer
          selectedShapeIds={selectedShapeIds}
          onSelectionChange={(ids) => setSelectedShapeIds(ids)}
          keyboardTransformMultiplier={5}
          onChange={(newRects, selectedShapesProps) => {
            setItems((prevItems) =>
              newRects.reduce((acc, newRect, index) => {
                const { shapeIndex } = selectedShapesProps[index];
                const item = acc[shapeIndex];
                return arrayReplace(acc, shapeIndex, {
                  ...item,
                  ...newRect,
                });
              }, prevItems)
            );
          }}
          onDelete={(event, selectedShapesProps) => {
            setItems((prevItems) =>
              selectedShapesProps
                .map((p) => p.shapeIndex)
                // Delete the indices in reverse so as not to shift the
                // other array elements and screw up the array indices
                .sort((a, b) => b - a)
                .reduce(
                  (acc, shapeIndex) => arrayReplace(acc, shapeIndex, []),
                  prevItems
                )
            );
          }}
        >
          <DrawLayer
            // Since the DrawLayer is a child of the SelectionLayer, it
            // receives click events before the SelectionLayer, and so
            // click-and-drag results in drawing
            onAddShape={({ x, y, width, height }) => {
              setItems((currentItems) => [
                ...currentItems,
                { id: `id${idIterator}`, x, y, width, height },
              ]);
              idIterator += 1;
            }}
          />
          {shapes}
        </SelectionLayer>
      </ShapeEditor>
      <br />
      <br />
      <br />
      <a href="https://github.com/fritz-c/react-shape-editor">
        React Shape Editor
      </a>
      <a ref={a}></a>
      <canvas ref={canvasRef}></canvas>
      <img ref={outputRef}></img>
    </div>
  );
};

const rootElement = document.getElementById('root');
ReactDOM.render(<Editor />, rootElement);
