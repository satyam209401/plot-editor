// 2D Map CAD Geometry & Path Utilities

/**
 * Catmull-Rom to Cubic Bezier curve path generator
 * Passes directly through all control points with no drift
 */
export const getSmoothPath = (points) => {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;
  if (points.length === 2) return `M ${points[0][0]} ${points[0][1]} L ${points[1][0]} ${points[1][1]}`;

  let path = `M ${points[0][0]} ${points[0][1]}`;
  const n = points.length;
  for (let i = 0; i < n - 1; i++) {
    const p0 = i === 0 ? points[0] : points[i - 1];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = i + 2 < n ? points[i + 2] : p2;

    const cp1x = p1[0] + (p2[0] - p0[0]) / 6;
    const cp1y = p1[1] + (p2[1] - p0[1]) / 6;
    const cp2x = p2[0] - (p3[0] - p1[0]) / 6;
    const cp2y = p2[1] - (p3[1] - p1[1]) / 6;

    path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2[0]} ${p2[1]}`;
  }
  return path;
};

/**
 * Generate SVG path data for roads (smooth or straight segments)
 */
export const getRoadPath = (points, isSmooth = false) => {
  if (!points || points.length === 0) return '';
  if (points.length === 1) return `M ${points[0][0]} ${points[0][1]}`;
  if (points.length === 2) return `M ${points[0][0]} ${points[0][1]} L ${points[1][0]} ${points[1][1]}`;
  if (isSmooth) return getSmoothPath(points);
  return points.map((p, i) => (i === 0 ? `M ${p[0]} ${p[1]}` : `L ${p[0]} ${p[1]}`)).join(' ');
};

/**
 * Splits road text across straight segments on turn/corner roads
 * Avoids placing text directly on corners to prevent letter collision
 */
export const getRoadSegmentLabels = (road) => {
  if (!road.name || !road.points || road.points.length < 2) return [];

  const segments = [];
  for (let i = 0; i < road.points.length - 1; i++) {
    const p1 = road.points[i];
    const p2 = road.points[i + 1];
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const length = Math.hypot(dx, dy);
    if (length > 30) {
      let angle = (Math.atan2(dy, dx) * 180) / Math.PI;
      if (angle > 90) angle -= 180;
      else if (angle < -90) angle += 180;

      segments.push({
        mx: (p1[0] + p2[0]) / 2,
        my: (p1[1] + p2[1]) / 2,
        angle,
        length
      });
    }
  }

  if (segments.length === 0) return [];

  if (segments.length === 1) {
    return [{ ...segments[0], text: road.name }];
  }

  const words = road.name.trim().split(/\s+/);
  if (words.length === 1) {
    return segments.map((seg) => ({ ...seg, text: words[0] }));
  }

  const result = [];
  const wordsPerSeg = Math.ceil(words.length / segments.length);
  for (let i = 0; i < segments.length; i++) {
    const segWords = words.slice(i * wordsPerSeg, (i + 1) * wordsPerSeg);
    if (segWords.length > 0) {
      result.push({
        ...segments[i],
        text: segWords.join(' ')
      });
    }
  }
  return result;
};

/**
 * Calculate polygon centroid for positioning labels
 */
export const getPolygonCentroid = (points) => {
  if (!points || points.length === 0) return { x: 0, y: 0 };
  let xSum = 0;
  let ySum = 0;
  points.forEach(([x, y]) => {
    xSum += x;
    ySum += y;
  });
  return {
    x: xSum / points.length,
    y: ySum / points.length
  };
};

/**
 * Convert array of points to SVG points string
 */
export const getPointsString = (points) => {
  if (!points) return '';
  return points.map(([x, y]) => `${x},${y}`).join(' ');
};
