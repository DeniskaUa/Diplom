'use client';

import React, { useState, useRef } from 'react';
import { FileUploader } from 'react-drag-drop-files';
import { Canvg } from 'canvg';
import rgbHex from 'rgb-hex';
import { cn } from '~/lib/cn';

import { ColorReducer } from '~/lib/generator/colorreductionmanagement';
import { RGB } from '~/lib/generator/common';
import { FacetBorderSegmenter } from '~/lib/generator/facetBorderSegmenter';
import { FacetBorderTracer } from '~/lib/generator/facetBorderTracer';
import { FacetCreator } from '~/lib/generator/facetCreator';
import { FacetLabelPlacer } from '~/lib/generator/facetLabelPlacer';
import { FacetResult } from '~/lib/generator/facetmanagement';
import { FacetReducer } from '~/lib/generator/facetReducer';
import { Settings } from '~/lib/generator/settings';
import { Point } from '~/lib/generator/structs/point';

async function createSVG(
  facetResult: FacetResult,
  colorsByIndex: RGB[],
  sizeMultiplier: number,
  fill: boolean,
  stroke: boolean,
  addColorLabels: boolean,
  fontSize: number = 60,
  fontColor: string = 'black',
  onUpdate: ((progress: number) => void) | null = null
) {
  let svgString = '';
  const xmlns = 'http://www.w3.org/2000/svg';

  const svgWidth = sizeMultiplier * facetResult.width;
  const svgHeight = sizeMultiplier * facetResult.height;
  svgString += `<?xml version="1.0" standalone="no"?>
                <svg width="${svgWidth}" height="${svgHeight}" xmlns="${xmlns}">`;

  for (const f of facetResult.facets) {
    if (f != null && f.borderSegments.length > 0) {
      let newpath: Point[] = [];
      const useSegments = true;
      if (useSegments) {
        newpath = f.getFullPathFromBorderSegments(false);
      } else {
        for (let i: number = 0; i < f.borderPath.length; i++) {
          newpath.push(
            new Point(f.borderPath[i].getWallX() + 0.5, f.borderPath[i].getWallY() + 0.5)
          );
        }
      }
      if (
        newpath[0].x !== newpath[newpath.length - 1].x ||
        newpath[0].y !== newpath[newpath.length - 1].y
      ) {
        newpath.push(newpath[0]);
      } // close loop if necessary

      // Create a path in SVG's namespace
      // using quadratic curve absolute positions

      let svgPathString = '';

      let data = 'M ';
      data += newpath[0].x * sizeMultiplier + ' ' + newpath[0].y * sizeMultiplier + ' ';
      for (let i: number = 1; i < newpath.length; i++) {
        const midpointX = (newpath[i].x + newpath[i - 1].x) / 2;
        const midpointY = (newpath[i].y + newpath[i - 1].y) / 2;
        data +=
          'Q ' +
          midpointX * sizeMultiplier +
          ' ' +
          midpointY * sizeMultiplier +
          ' ' +
          newpath[i].x * sizeMultiplier +
          ' ' +
          newpath[i].y * sizeMultiplier +
          ' ';
      }

      let svgStroke = '';
      if (stroke) {
        svgStroke = '#000';
      } else {
        // make the border the same color as the fill color if there is no border stroke
        // to not have gaps in between facets
        if (fill) {
          svgStroke = `rgb(${colorsByIndex[f.color][0]},${colorsByIndex[f.color][1]},${
            colorsByIndex[f.color][2]
          })`;
        }
      }

      let svgFill = '';
      if (fill) {
        svgFill = `rgb(${colorsByIndex[f.color][0]},${colorsByIndex[f.color][1]},${
          colorsByIndex[f.color][2]
        })`;
      } else {
        svgFill = 'none';
      }

      svgPathString = `<path data-facetId="${f.id}" d="${data}" `;

      svgPathString += `style="`;
      svgPathString += `fill: ${svgFill};`;
      if (svgStroke !== '') {
        svgPathString += `stroke: ${svgStroke}; stroke-width:1px`;
      }
      svgPathString += `"`;
      svgPathString += `>`;
      svgPathString += `</path>`;

      svgString += svgPathString;

      // add the color labels if necessary. I mean, this is the whole idea behind the paint by numbers part
      // so I don't know why you would hide them
      if (addColorLabels) {
        const labelOffsetX = f.labelBounds.minX * sizeMultiplier;
        const labelOffsetY = f.labelBounds.minY * sizeMultiplier;
        const labelWidth = f.labelBounds.width * sizeMultiplier;
        const labelHeight = f.labelBounds.height * sizeMultiplier;

        const nrOfDigits = (f.color + '').length;
        const svgLabelString = `<g class="label" transform="translate(${labelOffsetX},${labelOffsetY})">
                                      <svg width="${labelWidth}" height="${labelHeight}" overflow="visible" viewBox="-50 -50 100 100" preserveAspectRatio="xMidYMid meet">
                                          <text font-family="Tahoma" font-size="${
                                            fontSize / nrOfDigits
                                          }" dominant-baseline="middle" text-anchor="middle" fill="${fontColor}">${
          f.color
        }</text>
                                      </svg>
                                     </g>`;

        svgString += svgLabelString;
      }
    }
  }

  svgString += `</svg>`;

  return svgString;
}

class CLISettingsOutputProfile {
  public name: string = '';
  public svgShowLabels: boolean = true;
  public svgFillFacets: boolean = true;
  public svgShowBorders: boolean = true;
  public svgSizeMultiplier: number = 3;

  public svgFontSize: number = 60;
  public svgFontColor: string = 'black';

  public filetype: 'svg' | 'png' | 'jpg' = 'svg';
  public filetypeQuality: number = 95;
}

class CLISettings extends Settings {
  public outputProfiles: CLISettingsOutputProfile[] = [];
}

const createCanvas = (width: number, height: number): HTMLCanvasElement => {
  return Object.assign(document.createElement('canvas'), { width: width, height: height });
};

const createImageData = (
  array: Uint8ClampedArray = new Uint8ClampedArray(0),
  width = 0,
  height = 0
): ImageData => {
  return new ImageData(array, width, height);
};

const loadImage = (src: string, options?: HTMLImageElement): Promise<HTMLImageElement> => {
  return new Promise(function (resolve, reject) {
    const image = Object.assign(document.createElement('img'), {
      onload: () => {
        cleanup();
        resolve(image);
      },
      onerror: () => {
        cleanup();
        reject(new Error(`Failed to load the image "${src}"`));
      },
      ...options
    });

    function cleanup() {
      image.onload = null;
      image.onerror = null;
    }

    image.src = src;
  });
};

export const Editor = () => {
  const canvasFullRef = useRef<HTMLCanvasElement | null>(null);
  const canvasBordersLabelsRef = useRef<HTMLCanvasElement | null>(null);
  const canvasPaletteRef = useRef<HTMLCanvasElement | null>(null);
  const [paletteList, setPaletteList] = useState<string[]>();

  const [selectFile, setSelectFile] = useState<HTMLImageElement | null>(null);
  const [processResult, setProcessResult] = useState(null);

  const handleChange = async (file: File) => {
    if (file instanceof File && canvasFullRef.current) {
      const ctx = canvasFullRef.current.getContext('2d');

      try {
        const result = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const img = new Image();
        img.src = result;

        img.onload = () => {
          if (canvasFullRef.current?.width && canvasFullRef.current?.height) {
            canvasFullRef.current.width = img.width;
            canvasFullRef.current.height = img.height;
          }

          setSelectFile(img);
          ctx?.drawImage(img, 0, 0);
        };
      } catch (error) {
        console.error('Error reading file:', error);
      }
    }
  };

  const handleProcess = async () => {
    if (!selectFile) {
      return;
    }

    const settings: CLISettings = {
      kMeansNrOfClusters: 16,
      kMeansMinDeltaDifference: 1,
      kMeansClusteringColorSpace: 0,
      kMeansColorRestrictions: [],
      colorAliases: {},
      narrowPixelStripCleanupRuns: 3,
      removeFacetsSmallerThanNrOfPoints: 20,
      removeFacetsFromLargeToSmall: true,
      maximumNumberOfFacets: 1.7976931348623157e308,
      nrOfTimesToHalveBorderSegments: 2,
      resizeImageIfTooLarge: true,
      resizeImageWidth: 1024,
      resizeImageHeight: 1024,
      randomSeed: 1683506153965,
      outputProfiles: [
        {
          name: 'full',
          svgShowLabels: true,
          svgFillFacets: true,
          svgShowBorders: true,
          svgSizeMultiplier: 3,
          svgFontSize: 50,
          svgFontColor: '#333',
          filetype: 'png',
          filetypeQuality: 100
        },
        {
          name: 'bordersLabels',
          svgShowLabels: true,
          svgFillFacets: false,
          svgShowBorders: true,
          svgSizeMultiplier: 3,
          svgFontSize: 50,
          svgFontColor: '#333',
          filetype: 'png',
          filetypeQuality: 100
        }
      ]
    };

    const img = await loadImage(selectFile.src);
    const c = createCanvas(img.width, img.height);
    const ctx = c.getContext('2d');

    ctx?.drawImage(img, 0, 0, c.width, c.height);
    let imgData = ctx?.getImageData(0, 0, c.width, c.height);

    // resize if required
    if (
      settings.resizeImageIfTooLarge &&
      (c.width > settings.resizeImageWidth || c.height > settings.resizeImageHeight)
    ) {
      let width = c.width;
      let height = c.height;
      if (width > settings.resizeImageWidth) {
        const newWidth = settings.resizeImageWidth;
        const newHeight = (c.height / c.width) * settings.resizeImageWidth;
        width = newWidth;
        height = newHeight;
      }
      if (height > settings.resizeImageHeight) {
        const newHeight = settings.resizeImageHeight;
        const newWidth = (width / height) * newHeight;
        width = newWidth;
        height = newHeight;
      }

      const tempCanvas = createCanvas(width, height);
      tempCanvas.width = width;
      tempCanvas.height = height;
      tempCanvas.getContext('2d')!.drawImage(c, 0, 0, width, height);
      c.width = width;
      c.height = height;
      ctx?.drawImage(tempCanvas, 0, 0, width, height);
      imgData = ctx?.getImageData(0, 0, c.width, c.height);

      console.log(`Resized image to ${width}x${height}`);
    }

    if (!imgData || !ctx) {
      return;
    }

    console.log('Running k-means clustering');
    const cKmeans = createCanvas(imgData.width, imgData.height);
    const ctxKmeans = cKmeans.getContext('2d')!;
    ctxKmeans.fillStyle = 'white';
    ctxKmeans.fillRect(0, 0, cKmeans.width, cKmeans.height);

    const kmeansImgData = ctxKmeans.getImageData(0, 0, cKmeans.width, cKmeans.height);
    await ColorReducer.applyKMeansClustering(imgData, kmeansImgData, ctx, settings, (kmeans) => {
      const progress =
        (100 -
          (kmeans.currentDeltaDistanceDifference > 100
            ? 100
            : kmeans.currentDeltaDistanceDifference)) /
        100;
      ctxKmeans.putImageData(kmeansImgData, 0, 0);
    });

    const colormapResult = ColorReducer.createColorMap(kmeansImgData);

    let facetResult = new FacetResult();
    if (
      typeof settings.narrowPixelStripCleanupRuns === 'undefined' ||
      settings.narrowPixelStripCleanupRuns === 0
    ) {
      console.log('Creating facets');
      facetResult = await FacetCreator.getFacets(
        imgData.width,
        imgData.height,
        colormapResult.imgColorIndices,
        (progress) => {
          // progress
        }
      );

      console.log('Reducing facets');
      await FacetReducer.reduceFacets(
        settings.removeFacetsSmallerThanNrOfPoints,
        settings.removeFacetsFromLargeToSmall,
        settings.maximumNumberOfFacets,
        colormapResult.colorsByIndex,
        facetResult,
        colormapResult.imgColorIndices,
        (progress) => {
          // progress
        }
      );
    } else {
      for (let run = 0; run < settings.narrowPixelStripCleanupRuns; run++) {
        console.log('Removing narrow pixels run #' + (run + 1));
        // clean up narrow pixel strips
        await ColorReducer.processNarrowPixelStripCleanup(colormapResult);

        console.log('Creating facets');
        facetResult = await FacetCreator.getFacets(
          imgData.width,
          imgData.height,
          colormapResult.imgColorIndices,
          (progress) => {
            // progress
          }
        );

        console.log('Reducing facets');
        await FacetReducer.reduceFacets(
          settings.removeFacetsSmallerThanNrOfPoints,
          settings.removeFacetsFromLargeToSmall,
          settings.maximumNumberOfFacets,
          colormapResult.colorsByIndex,
          facetResult,
          colormapResult.imgColorIndices,
          (progress) => {
            // progress
          }
        );

        // the colormapResult.imgColorIndices get updated as the facets are reduced, so just do a few runs of pixel cleanup
      }
    }

    console.log('Build border paths');
    await FacetBorderTracer.buildFacetBorderPaths(facetResult, (progress) => {
      // progress
    });

    console.log('Build border path segments');
    await FacetBorderSegmenter.buildFacetBorderSegments(
      facetResult,
      settings.nrOfTimesToHalveBorderSegments,
      (progress) => {
        // progress
      }
    );

    console.log('Determine label placement');
    await FacetLabelPlacer.buildFacetLabelBounds(facetResult, (progress) => {
      // progress
    });

    for (const profile of settings.outputProfiles) {
      console.log('Generating output for ' + profile.name);

      if (typeof profile.filetype === 'undefined') {
        profile.filetype = 'svg';
      }

      const svgString = await createSVG(
        facetResult,
        colormapResult.colorsByIndex,
        profile.svgSizeMultiplier,
        profile.svgFillFacets,
        profile.svgShowBorders,
        profile.svgShowLabels,
        profile.svgFontSize,
        profile.svgFontColor
      );

      let ctx;

      if (profile.name === 'full') {
        ctx = canvasFullRef.current?.getContext('2d');
      }

      if (profile.name === 'bordersLabels') {
        ctx = canvasBordersLabelsRef.current?.getContext('2d');
      }

      if (ctx) {
        const v = Canvg.fromString(ctx, svgString);
        v.start();
      }
    }

    console.log('Generating palette info');
    const colorFrequency: number[] = [];
    for (const color of colormapResult.colorsByIndex) {
      colorFrequency.push(0);
    }

    for (const facet of facetResult.facets) {
      if (facet !== null) {
        colorFrequency[facet.color] += facet.pointCount;
      }
    }

    const colorAliasesByColor: { [key: string]: string } = {};
    for (const alias of Object.keys(settings.colorAliases)) {
      colorAliasesByColor[settings.colorAliases[alias].join(',')] = alias;
    }

    const totalFrequency = colorFrequency.reduce((sum, val) => sum + val);

    const paletteInfo = colormapResult.colorsByIndex.map((color, index) => {
      return {
        areaPercentage: colorFrequency[index] / totalFrequency,
        color,
        colorAlias: colorAliasesByColor[color.join(',')],
        frequency: colorFrequency[index],
        index
      };
    });

    setPaletteList(paletteInfo.map((data) => rgbHex(data.color[0], data.color[1], data.color[2])));
  };

  return (
    <section className="my-14">
      <FileUploader
        handleChange={handleChange}
        name="file"
        types={['JPG', 'JPEG', 'PNG']}
        classes="editor-uploader"
      />

      <button type="button" onClick={handleProcess} className="my-2 bg-red-400 px-2">
        Process image
      </button>

      <canvas ref={canvasFullRef} style={{ backgroundColor: '#e5e7eb' }} />
      <canvas ref={canvasBordersLabelsRef} style={{ backgroundColor: '#9ca3af' }} />

      <div className="mt-10 flex gap-4">
        {paletteList?.map((color, index) => {
          return (
            <div className="relative flex items-center justify-center gap-2">
              <div className="absolute shadow">{index}</div>

              <div
                className={cn('h-10 w-10 border border-slate-100')}
                style={{
                  backgroundColor: `#${color}`
                }}
                key={color}
              />
            </div>
          );
        })}
      </div>
    </section>
  );
};
