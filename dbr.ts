import { CoreModule } from 'dynamsoft-core';
import { LicenseManager } from 'dynamsoft-license';
import 'dynamsoft-barcode-reader';

CoreModule.engineResourcePaths = {
  std: 'https://cdn.jsdelivr.net/npm/dynamsoft-capture-vision-std@1.2.10/dist/',
  dip: 'https://cdn.jsdelivr.net/npm/dynamsoft-image-processing@2.2.30/dist/',
  core: 'https://cdn.jsdelivr.net/npm/dynamsoft-core@3.2.30/dist/',
  license: 'https://cdn.jsdelivr.net/npm/dynamsoft-license@3.2.21/dist/',
  cvr: 'https://cdn.jsdelivr.net/npm/dynamsoft-capture-vision-router@2.2.30/dist/',
  dbr: 'https://cdn.jsdelivr.net/npm/dynamsoft-barcode-reader@10.2.10/dist/',
  dce: 'https://cdn.jsdelivr.net/npm/dynamsoft-camera-enhancer@4.0.3/dist/',
  dcp: 'https://cdn.jsdelivr.net/npm/dynamsoft-code-parser@2.0.20/dist/',
};

LicenseManager.initLicense('My-Key', true);

CoreModule.loadWasm(['DBR']);