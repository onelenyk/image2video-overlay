import type {
  CanvasElement,
  ConnectionRef,
  LineEndpoint,
  Position,
} from "../types";
import {
  isConnectionRef,
  isPointOverlay,
  isLineOverlay,
  isPolygonOverlay,
} from "../types";

/**
 * Resolve a line endpoint to an actual position.
 * If the endpoint is a ConnectionRef, look up the connected element and return its position.
 * If the endpoint is a Position, return it directly.
 */
export function resolveEndpoint(
  endpoint: LineEndpoint,
  elements: CanvasElement[]
): Position | null {
  // If it's a plain position, return it directly
  if (!isConnectionRef(endpoint)) {
    return endpoint;
  }

  // It's a connection reference - look up the connected element
  const connectedElement = elements.find((el) => el.id === endpoint.elementId);
  if (!connectedElement) {
    return null; // Connected element was deleted
  }

  // Resolve based on element type
  if (isPointOverlay(connectedElement)) {
    return connectedElement.position;
  }

  if (isLineOverlay(connectedElement)) {
    // Get the specified endpoint of the connected line
    const lineEndpoint =
      endpoint.endpoint === "start"
        ? connectedElement.startPoint
        : connectedElement.endPoint;
    // Recursively resolve (in case that endpoint is also a connection)
    return resolveEndpoint(lineEndpoint, elements);
  }

  if (isPolygonOverlay(connectedElement)) {
    // Get the specified vertex of the polygon
    const vertexIndex = endpoint.vertexIndex ?? 0;
    if (vertexIndex >= 0 && vertexIndex < connectedElement.points.length) {
      return connectedElement.points[vertexIndex];
    }
    return null; // Invalid vertex index
  }

  return null; // Unsupported element type
}

/**
 * Find all connectable points near a given position.
 * Returns points from: PointOverlays, Line endpoints, Polygon vertices
 */
export interface ConnectablePoint {
  position: Position;
  connectionRef: ConnectionRef;
  label: string;
}

export function findConnectablePoints(
  elements: CanvasElement[],
  excludeElementId?: string
): ConnectablePoint[] {
  const points: ConnectablePoint[] = [];

  for (const element of elements) {
    if (element.id === excludeElementId) continue;

    if (isPointOverlay(element)) {
      points.push({
        position: element.position,
        connectionRef: { elementId: element.id },
        label: element.label || element.id,
      });
    }

    if (isLineOverlay(element)) {
      // Add start point
      const startPos = resolveEndpoint(element.startPoint, elements);
      if (startPos) {
        points.push({
          position: startPos,
          connectionRef: { elementId: element.id, endpoint: "start" },
          label: `${element.id} (start)`,
        });
      }

      // Add end point
      const endPos = resolveEndpoint(element.endPoint, elements);
      if (endPos) {
        points.push({
          position: endPos,
          connectionRef: { elementId: element.id, endpoint: "end" },
          label: `${element.id} (end)`,
        });
      }
    }

    if (isPolygonOverlay(element)) {
      // Add all vertices
      element.points.forEach((point, index) => {
        points.push({
          position: point,
          connectionRef: { elementId: element.id, vertexIndex: index },
          label: `${element.id} (v${index + 1})`,
        });
      });
    }
  }

  return points;
}

/**
 * Find the nearest connectable point within a snap distance.
 */
export function findNearestSnapPoint(
  position: Position,
  elements: CanvasElement[],
  snapDistance: number = 3, // percentage units
  excludeElementId?: string
): ConnectablePoint | null {
  const connectablePoints = findConnectablePoints(elements, excludeElementId);

  let nearest: ConnectablePoint | null = null;
  let nearestDistance = Infinity;

  for (const point of connectablePoints) {
    const dx = point.position.x - position.x;
    const dy = point.position.y - position.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < snapDistance && distance < nearestDistance) {
      nearest = point;
      nearestDistance = distance;
    }
  }

  return nearest;
}

/**
 * Get all elements connected to a given element.
 * Used to update connected elements when one moves.
 */
export function getConnectedElements(
  elementId: string,
  elements: CanvasElement[]
): { element: CanvasElement; connectionType: "start" | "end" | "vertex" }[] {
  const connected: { element: CanvasElement; connectionType: "start" | "end" | "vertex" }[] = [];

  for (const element of elements) {
    if (isLineOverlay(element)) {
      if (isConnectionRef(element.startPoint) && element.startPoint.elementId === elementId) {
        connected.push({ element, connectionType: "start" });
      }
      if (isConnectionRef(element.endPoint) && element.endPoint.elementId === elementId) {
        connected.push({ element, connectionType: "end" });
      }
    }
  }

  return connected;
}
