// Type declarations for Leaflet
declare module 'leaflet' {
  export interface MapOptions {
    center?: LatLngExpression;
    zoom?: number;
    layers?: Layer[];
    minZoom?: number;
    maxZoom?: number;
    maxBounds?: LatLngBoundsExpression;
    renderer?: Renderer;
    crs?: CRS;
    zoomControl?: boolean;
    attributionControl?: boolean;
    fadeAnimation?: boolean;
    markerZoomAnimation?: boolean;
    transform3DLimit?: number;
    zoomSnap?: number;
    zoomDelta?: number;
    trackResize?: boolean;
    boxZoom?: boolean;
    doubleClickZoom?: boolean | 'center';
    dragging?: boolean;
    touchZoom?: boolean | 'center';
    scrollWheelZoom?: boolean | 'center';
    tap?: boolean;
    tapTolerance?: number;
    touchRotate?: boolean;
    bounceAtZoomLimits?: boolean;
    keyboard?: boolean;
    keyboardPanDelta?: number;
  }

  export interface TileLayerOptions {
    minZoom?: number;
    maxZoom?: number;
    maxNativeZoom?: number;
    minNativeZoom?: number;
    subdomains?: string | string[];
    errorTileUrl?: string;
    zoomOffset?: number;
    zoomReverse?: boolean;
    detectRetina?: boolean;
    crossOrigin?: boolean | string;
    referrerPolicy?: string;
    tileSize?: number | Point;
    opacity?: number;
    updateWhenIdle?: boolean;
    updateWhenZooming?: boolean;
    updateInterval?: number;
    zIndex?: number;
    bounds?: LatLngBoundsExpression;
    className?: string;
    keepBuffer?: number;
    noWrap?: boolean;
    pane?: string;
    attribution?: string;
  }

  export interface MarkerOptions {
    icon?: Icon | DivIcon;
    draggable?: boolean;
    keyboard?: boolean;
    title?: string;
    alt?: string;
    zIndexOffset?: number;
    opacity?: number;
    riseOnHover?: boolean;
    riseOffset?: number;
    pane?: string;
    bubblingMouseEvents?: boolean;
    autoPanOnFocus?: boolean;
  }

  export interface PopupOptions {
    maxWidth?: number;
    minWidth?: number;
    maxHeight?: number;
    autoPan?: boolean;
    autoPanPaddingTopLeft?: PointExpression;
    autoPanPaddingBottomRight?: PointExpression;
    autoPanPadding?: PointExpression;
    keepInView?: boolean;
    closeButton?: boolean;
    autoClose?: boolean;
    closeOnEscapeKey?: boolean;
    className?: string;
    pane?: string;
    offset?: PointExpression;
  }

  export interface TooltipOptions {
    pane?: string;
    offset?: PointExpression;
    direction?: 'right' | 'left' | 'top' | 'bottom' | 'center' | 'auto';
    permanent?: boolean;
    sticky?: boolean;
    opacity?: number;
    className?: string;
  }

  export interface PathOptions {
    stroke?: boolean;
    color?: string;
    weight?: number;
    opacity?: number;
    lineCap?: 'butt' | 'round' | 'square';
    lineJoin?: 'miter' | 'round' | 'bevel';
    dashArray?: string | number[];
    dashOffset?: string;
    fill?: boolean;
    fillColor?: string;
    fillOpacity?: number;
    fillRule?: 'nonzero' | 'evenodd';
    renderer?: Renderer;
    className?: string;
    bubblingMouseEvents?: boolean;
  }

  export interface ControlOptions {
    position?: ControlPosition;
  }

  export type ControlPosition = 'topleft' | 'topright' | 'bottomleft' | 'bottomright';

  export interface ZoomControlOptions extends ControlOptions {
    zoomInText?: string;
    zoomInTitle?: string;
    zoomOutText?: string;
    zoomOutTitle?: string;
  }

  export interface AttributionControlOptions extends ControlOptions {
    prefix?: string | boolean;
  }

  export interface ScaleControlOptions extends ControlOptions {
    maxWidth?: number;
    metric?: boolean;
    imperial?: boolean;
    updateWhenIdle?: boolean;
  }

  export interface LayersControlOptions extends ControlOptions {
    collapsed?: boolean;
    autoZIndex?: boolean;
    hideSingleBase?: boolean;
    sortLayers?: boolean;
    sortFunction?: (a: Layer, b: Layer, aName: string, bName: string) => number;
  }

  export interface ZoomPanOptions {
    animate?: boolean;
    duration?: number;
    easeLinearity?: number;
    noMoveStart?: boolean;
  }

  export interface FitBoundsOptions extends ZoomPanOptions {
    paddingTopLeft?: PointExpression;
    paddingBottomRight?: PointExpression;
    padding?: PointExpression;
    maxZoom?: number;
  }

  export interface GridLayerOptions {
    tileSize?: number | Point;
    opacity?: number;
    updateWhenIdle?: boolean;
    updateWhenZooming?: boolean;
    updateInterval?: number;
    zIndex?: number;
    bounds?: LatLngBoundsExpression;
    minZoom?: number;
    maxZoom?: number;
    maxNativeZoom?: number;
    minNativeZoom?: number;
    noWrap?: boolean;
    pane?: string;
    className?: string;
    keepBuffer?: number;
  }

  export interface IconOptions {
    iconUrl: string;
    iconRetinaUrl?: string;
    iconSize?: PointExpression;
    iconAnchor?: PointExpression;
    popupAnchor?: PointExpression;
    tooltipAnchor?: PointExpression;
    shadowUrl?: string;
    shadowRetinaUrl?: string;
    shadowSize?: PointExpression;
    shadowAnchor?: PointExpression;
    className?: string;
  }

  export interface DivIconOptions {
    html?: string | false;
    bgPos?: PointExpression;
    iconSize?: PointExpression;
    iconAnchor?: PointExpression;
    popupAnchor?: PointExpression;
    tooltipAnchor?: PointExpression;
    className?: string;
  }

  export interface GeoJSONOptions {
    style?: PathOptions | ((feature: any) => PathOptions);
    onEachFeature?: (feature: any, layer: Layer) => void;
    filter?: (feature: any, layer: Layer) => boolean;
    coordsToLatLng?: (coords: number[]) => LatLng;
    pointToLayer?: (feature: any, latlng: LatLng) => Layer;
  }

  export class Class {
    static extend(props: any): any;
    static include(props: any): any;
    static mergeOptions(options: any): any;
    options: any;
    initialize(...args: any[]): void;
  }

  export interface Evented {
    on(types: string, fn: Function, context?: any): this;
    on(eventMap: Record<string, Function>): this;
    off(types: string, fn: Function, context?: any): this;
    off(eventMap: Record<string, Function>): this;
    off(): this;
    fire(type: string, data?: any, propagate?: boolean): this;
    listens(type: string, propagate?: boolean): boolean;
    once(types: string, fn: Function, context?: any): this;
    addEventListener(types: string, fn: Function, context?: any): this;
    removeEventListener(types: string, fn: Function, context?: any): this;
    clearAllEventListeners(): this;
    addOneTimeEventListener(types: string, fn: Function, context?: any): this;
    fireEvent(type: string, data?: any, propagate?: boolean): this;
    hasEventListeners(type: string): boolean;
  }

  export interface Layer extends Evented {
    addTo(map: Map): this;
    remove(): this;
    removeFrom(map: Map): this;
    getPane(name?: string): HTMLElement | undefined;
    getAttribution(): string | undefined;
    getEvents(): Record<string, Function>;
    getLayerId(): number;
  }

  export interface GridLayer extends Layer {
    setOpacity(opacity: number): this;
    setZIndex(zIndex: number): this;
    isLoading(): boolean;
    redraw(): this;
    getTileSize(): Point;
  }

  export interface TileLayer extends GridLayer {
    setUrl(url: string, noRedraw?: boolean): this;
    getTileUrl(coords: Point): string;
  }

  export interface Marker extends Layer {
    setLatLng(latlng: LatLngExpression): this;
    getLatLng(): LatLng;
    setIcon(icon: Icon | DivIcon): this;
    getIcon(): Icon | DivIcon;
    setOpacity(opacity: number): this;
    setZIndexOffset(offset: number): this;
    getTooltip(): Tooltip | undefined;
    bindTooltip(content: string | HTMLElement | Tooltip, options?: TooltipOptions): this;
    unbindTooltip(): this;
    openTooltip(latlng?: LatLngExpression): this;
    closeTooltip(): this;
    toggleTooltip(): this;
    isTooltipOpen(): boolean;
    setTooltipContent(content: string | HTMLElement | Tooltip): this;
    getPopup(): Popup | undefined;
    bindPopup(content: string | HTMLElement | Popup, options?: PopupOptions): this;
    unbindPopup(): this;
    openPopup(latlng?: LatLngExpression): this;
    closePopup(): this;
    togglePopup(): this;
    isPopupOpen(): boolean;
    setPopupContent(content: string | HTMLElement | Popup): this;
  }

  export interface Popup extends Layer {
    setLatLng(latlng: LatLngExpression): this;
    getLatLng(): LatLng;
    setContent(content: string | HTMLElement | Popup): this;
    getContent(): string | HTMLElement | Popup | undefined;
    getElement(): HTMLElement | undefined;
    update(): this;
    isOpen(): boolean;
    bringToFront(): this;
    bringToBack(): this;
    openOn(map: Map): this;
  }

  export interface Tooltip extends Layer {
    setLatLng(latlng: LatLngExpression): this;
    getLatLng(): LatLng;
    setContent(content: string | HTMLElement | Tooltip): this;
    getContent(): string | HTMLElement | Tooltip | undefined;
    getElement(): HTMLElement | undefined;
    update(): this;
    isOpen(): boolean;
    bringToFront(): this;
    bringToBack(): this;
    openOn(map: Map): this;
  }

  export interface Path extends Layer {
    setStyle(style: PathOptions): this;
    getStyle(): PathOptions;
    bringToFront(): this;
    bringToBack(): this;
    redraw(): this;
    getElement(): SVGGElement | undefined;
    getCenter(): LatLng | undefined;
    getBounds(): LatLngBounds | undefined;
    setBubblingMouseEvents(bubblingMouseEvents: boolean): this;
    isBubblingMouseEvents(): boolean;
  }

  export interface CircleMarker extends Path {
    setLatLng(latlng: LatLngExpression): this;
    getLatLng(): LatLng;
    setRadius(radius: number): this;
    getRadius(): number;
  }

  export interface Circle extends CircleMarker {
    getBounds(): LatLngBounds;
  }

  export interface Polyline extends Path {
    setLatLngs(latlngs: LatLngExpression[]): this;
    getLatLngs(): LatLng[];
    addLatLng(latlng: LatLngExpression): this;
    getBounds(): LatLngBounds;
    toGeoJSON(): any;
  }

  export interface Polygon extends Polyline {
    setLatLngs(latlngs: LatLngExpression[][]): this;
    getLatLngs(): LatLng[][];
  }

  export interface Rectangle extends Path {
    setBounds(bounds: LatLngBoundsExpression): this;
    getBounds(): LatLngBounds;
  }

  export interface LayerGroup extends Layer {
    addLayer(layer: Layer): this;
    removeLayer(layer: Layer): this;
    clearLayers(): this;
    invoke(methodName: string, ...params: any[]): this;
    eachLayer(fn: (layer: Layer) => void, context?: any): this;
    getLayer(id: number): Layer | undefined;
    getLayers(): Layer[];
    setZIndex(zIndex: number): this;
    getLayerId(layer: Layer): number;
  }

  export interface FeatureGroup extends LayerGroup {
    setStyle(style: PathOptions): this;
    bringToFront(): this;
    bringToBack(): this;
    getBounds(): LatLngBounds;
  }

  export interface GeoJSON extends FeatureGroup {
    addData(data: any): this;
    resetStyle(layer: Layer): this;
    setStyle(style: PathOptions | ((feature: any) => PathOptions)): this;
  }

  export interface Control extends Layer {
    getPosition(): ControlPosition;
    setPosition(position: ControlPosition): this;
    getContainer(): HTMLElement | undefined;
    addTo(map: Map): this;
    remove(): this;
  }

  export interface ZoomControl extends Control {}
  export interface AttributionControl extends Control {
    addAttribution(attribution: string): this;
    removeAttribution(attribution: string): this;
  }
  export interface ScaleControl extends Control {}
  export interface LayersControl extends Control {
    addBaseLayer(layer: Layer, name: string): this;
    addOverlay(layer: Layer, name: string): this;
    removeLayer(layer: Layer): this;
    expand(): this;
    collapse(): this;
  }

  export interface Renderer extends Layer {
    getContainer(): HTMLElement | undefined;
    getEvents(): Record<string, Function>;
  }

  export interface SVG extends Renderer {}
  export interface Canvas extends Renderer {}

  export interface Map extends Evented {
    setView(center: LatLngExpression, zoom: number, options?: ZoomPanOptions): this;
    setZoom(zoom: number, options?: ZoomPanOptions): this;
    zoomIn(delta?: number, options?: ZoomPanOptions): this;
    zoomOut(delta?: number, options?: ZoomPanOptions): this;
    setZoomAround(latlng: LatLngExpression, zoom: number, options?: ZoomPanOptions): this;
    getBoundsZoom(bounds: LatLngBoundsExpression, inside?: boolean, padding?: PointExpression): number;
    getSize(): Point;
    getPixelBounds(): Bounds;
    getPixelOrigin(): Point;
    getPanes(): MapPanes;
    getContainer(): HTMLElement;
    getZoomScale(toZoom: number, fromZoom: number): number;
    getScaleZoom(scale: number, fromZoom: number): number;
    project(latlng: LatLngExpression, zoom: number): Point;
    unproject(point: Point, zoom: number): LatLng;
    layerPointToLatLng(point: Point): LatLng;
    latLngToLayerPoint(latlng: LatLngExpression): Point;
    wrapLatLng(latlng: LatLng): LatLng;
    wrapLatLngBounds(bounds: LatLngBounds): LatLngBounds;
    distance(latlng1: LatLng, latlng2: LatLng): number;
    containerPointToLayerPoint(point: Point): Point;
    layerPointToContainerPoint(point: Point): Point;
    containerPointToLatLng(point: Point): LatLng;
    latLngToContainerPoint(latlng: LatLngExpression): Point;
    mouseEventToContainerPoint(ev: MouseEvent): Point;
    mouseEventToLayerPoint(ev: MouseEvent): Point;
    mouseEventToLatLng(ev: MouseEvent): LatLng;
    getCenter(): LatLng | undefined;
    getZoom(): number;
    getBounds(): LatLngBounds;
    getMinZoom(): number;
    getMaxZoom(): number;
    getBoundsZoom(bounds: LatLngBoundsExpression, inside?: boolean): number;
    getContainerZoom(): number;
    setMaxBounds(bounds: LatLngBoundsExpression): this;
    setMinZoom(zoom: number): this;
    setMaxZoom(zoom: number): this;
    panTo(latlng: LatLngExpression, options?: ZoomPanOptions): this;
    panBy(offset: PointExpression, options?: ZoomPanOptions): this;
    setView(center: LatLngExpression, zoom: number, options?: ZoomPanOptions): this;
    fitBounds(bounds: LatLngBoundsExpression, options?: FitBoundsOptions): this;
    fitWorld(options?: FitBoundsOptions): this;
    panInsideBounds(bounds: LatLngBoundsExpression, options?: ZoomPanOptions): this;
    invalidateSize(options?: { animate?: boolean; pan?: boolean }): this;
    stop(): this;
    addControl(control: Control): this;
    removeControl(control: Control): this;
    addLayer(layer: Layer): this;
    removeLayer(layer: Layer): this;
    hasLayer(layer: Layer): boolean;
    eachLayer(fn: (layer: Layer) => void, context?: any): this;
    openPopup(popup: string | HTMLElement | Popup, latlng?: LatLngExpression, options?: PopupOptions): this;
    closePopup(popup?: Popup): this;
    openTooltip(tooltip: string | HTMLElement | Tooltip, latlng?: LatLngExpression, options?: TooltipOptions): this;
    closeTooltip(tooltip?: Tooltip): this;
    getRenderer(layer: Path): Renderer;
    getZoomScale(toZoom: number, fromZoom: number): number;
    getScaleZoom(scale: number, fromZoom: number): number;
    whenReady(fn: Function, context?: any): this;
  }

  export interface LatLng {
    lat: number;
    lng: number;
    alt?: number;
    equals(otherLatLng: LatLng, maxMargin?: number): boolean;
    toString(): string;
    distanceTo(otherLatLng: LatLng): number;
    wrap(): LatLng;
    toBounds(sizeInMeters: number): LatLngBounds;
  }

  export type LatLngExpression = LatLng | [number, number] | { lat: number; lng: number } | { lat: number; lon: number };

  export interface LatLngBounds {
    getSouthWest(): LatLng;
    getNorthEast(): LatLng;
    getNorthWest(): LatLng;
    getSouthEast(): LatLng;
    getCenter(): LatLng;
    getNorth(): number;
    getSouth(): number;
    getEast(): number;
    getWest(): number;
    contains(otherBounds: LatLngBounds): boolean;
    intersects(otherBounds: LatLngBounds): boolean;
    overlaps(otherBounds: LatLngBounds): boolean;
    extend(obj: LatLngExpression | LatLngBoundsExpression): this;
    pad(bufferRatio: number): LatLngBounds;
    isValid(): boolean;
    toBBoxString(): string;
  }

  export type LatLngBoundsExpression = LatLngBounds | LatLngExpression[] | [LatLngExpression, LatLngExpression];

  export interface Point {
    x: number;
    y: number;
    clone(): Point;
    add(otherPoint: PointExpression): Point;
    subtract(otherPoint: PointExpression): Point;
    multiplyBy(k: number): Point;
    divideBy(k: number): Point;
    scaleBy(point: PointExpression): Point;
    unscaleBy(point: PointExpression): Point;
    round(): Point;
    floor(): Point;
    ceil(): Point;
    trunc(): Point;
    equals(otherPoint: PointExpression): boolean;
    contains(otherPoint: PointExpression): boolean;
    toString(): string;
  }

  export type PointExpression = Point | [number, number] | { x: number; y: number };

  export interface Bounds {
    min: Point;
    max: Point;
    extend(obj: PointExpression): this;
    getCenter(round?: boolean): Point;
    getBottomLeft(): Point;
    getTopRight(): Point;
    getSize(): Point;
    contains(otherBounds: Bounds | PointExpression): boolean;
    intersects(otherBounds: Bounds): boolean;
    overlaps(otherBounds: Bounds): boolean;
    isValid(): boolean;
  }

  export interface CRS {
    projection: Projection;
    transformation: Transformation;
    code: string;
    distance(latlng1: LatLng, latlng2: LatLng): number;
    scale(zoom: number): number;
    zoom(scale: number): number;
    project(latlng: LatLng): Point;
    unproject(point: Point): LatLng;
    wrapLatLng(latlng: LatLng): LatLng;
  }

  export interface Projection {
    project(latlng: LatLng): Point;
    unproject(point: Point): LatLng;
    bounds: LatLngBounds;
  }

  export interface Transformation {
    a: number;
    b: number;
    c: number;
    d: number;
    transform(point: Point, scale?: number): Point;
    untransform(point: Point, scale?: number): Point;
  }

  export interface MapPanes {
    mapPane: HTMLElement;
    tilePane: HTMLElement;
    overlayPane: HTMLElement;
    shadowPane: HTMLElement;
    markerPane: HTMLElement;
    tooltipPane: HTMLElement;
    popupPane: HTMLElement;
  }

  export class Icon extends Class {
    constructor(options: IconOptions);
    createIcon(oldIcon?: HTMLElement): HTMLElement;
    createShadow(oldIcon?: HTMLElement): HTMLElement;
    getIconUrl(name: string): string;
  }

  export class DivIcon extends Icon {
    constructor(options: DivIconOptions);
  }

  export function map(element: string | HTMLElement, options?: MapOptions): Map;
  export function tileLayer(urlTemplate: string, options?: TileLayerOptions): TileLayer;
  export function marker(latlng: LatLngExpression, options?: MarkerOptions): Marker;
  export function popup(options?: PopupOptions, source?: Layer): Popup;
  export function tooltip(options?: TooltipOptions, source?: Layer): Tooltip;
  export function icon(options: IconOptions): Icon;
  export function divIcon(options: DivIconOptions): DivIcon;
  export function circleMarker(latlng: LatLngExpression, options?: PathOptions & { radius?: number }): CircleMarker;
  export function circle(latlng: LatLngExpression, options?: PathOptions & { radius?: number }): Circle;
  export function polyline(latlngs: LatLngExpression[], options?: PathOptions): Polyline;
  export function polygon(latlngs: LatLngExpression[][], options?: PathOptions): Polygon;
  export function rectangle(bounds: LatLngBoundsExpression, options?: PathOptions): Rectangle;
  export function layerGroup(layers?: Layer[]): LayerGroup;
  export function featureGroup(layers?: Layer[]): FeatureGroup;
  export function geoJSON(geojson?: any, options?: GeoJSONOptions): GeoJSON;
  export function gridLayer(options?: GridLayerOptions): GridLayer;
  export function controlZoom(options?: ZoomControlOptions): ZoomControl;
  export function controlAttribution(options?: AttributionControlOptions): AttributionControl;
  export function controlScale(options?: ScaleControlOptions): ScaleControl;
  export function controlLayers(baseLayers?: Record<string, Layer>, overlays?: Record<string, Layer>, options?: LayersControlOptions): LayersControl;
  export function latLng(lat: number, lng: number, alt?: number): LatLng;
  export function latLngBounds(southWest: LatLngExpression, northEast: LatLngExpression): LatLngBounds;
  export function point(x: number, y: number, round?: boolean): Point;
  export function bounds(topLeft: PointExpression, bottomRight: PointExpression): LatLngBounds;
  export function domEventOn(el: HTMLElement, types: string, fn: Function, context?: any): this;
  export function domEventOff(el: HTMLElement, types: string, fn: Function, context?: any): this;
  export function domEventStopPropagation(ev: Event): this;
  export function domEventDisableClickPropagation(el: HTMLElement): this;
  export function domEventDisableScrollPropagation(el: HTMLElement): this;
  export function domEventPreventDefault(ev: Event): this;
  export function domEventGetMousePosition(ev: Event, container?: HTMLElement): Point;
  export function domUtilGet(id: string | HTMLElement): HTMLElement | undefined;
  export function domUtilCreate(tagName: string, className?: string, container?: HTMLElement): HTMLElement;
  export function domUtilRemove(el: HTMLElement): void;
  export function domUtilEmpty(el: HTMLElement): void;
  export function domUtilToFront(el: HTMLElement): void;
  export function domUtilToBack(el: HTMLElement): void;
  export function domUtilHasClass(el: HTMLElement, name: string): boolean;
  export function domUtilAddClass(el: HTMLElement, name: string): void;
  export function domUtilRemoveClass(el: HTMLElement, name: string): void;
  export function domUtilSetClass(el: HTMLElement, name: string): void;
  export function domUtilGetStyle(el: HTMLElement, styleProp: string): string;
  export const browserRetina: boolean;
  export const browserTouch: boolean;
  export const browserPointerEvent: boolean;
  export const Util: any;
  export const DomEvent: any;
  export const DomUtil: any;
  export const Browser: any;
  export const CRS: {
    EPSG3857: CRS;
    EPSG4326: CRS;
    EPSG3395: CRS;
    Earth: CRS;
  };
}