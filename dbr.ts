import { CoreModule } from 'dynamsoft-core';
import { LicenseManager } from 'dynamsoft-license';
import { LabelRecognizerModule } from 'dynamsoft-label-recognizer';
import { CodeParserModule } from 'dynamsoft-code-parser';
import 'dynamsoft-barcode-reader';

CoreModule.engineResourcePaths = {
  // The following code uses the jsDelivr CDN, feel free to change it to your own location of these files
  core: 'https://cdn.jsdelivr.net/npm/dynamsoft-core@3.2.30/dist/',
  license: 'https://cdn.jsdelivr.net/npm/dynamsoft-license@3.2.21/dist/',
  dlr: 'https://cdn.jsdelivr.net/npm/dynamsoft-label-recognizer@3.2.30/dist/',
  cvr: 'https://cdn.jsdelivr.net/npm/dynamsoft-capture-vision-router@2.2.30/dist/',
  dce: 'https://cdn.jsdelivr.net/npm/dynamsoft-camera-enhancer@4.0.3/dist/',
  std: 'https://cdn.jsdelivr.net/npm/dynamsoft-capture-vision-std@1.2.10/dist/',
  dip: 'https://cdn.jsdelivr.net/npm/dynamsoft-image-processing@2.2.30/dist/',
  dnn: 'https://cdn.jsdelivr.net/npm/dynamsoft-capture-vision-dnn@1.0.20/dist/',
  dcp: 'https://cdn.jsdelivr.net/npm/dynamsoft-code-parser@2.2.10/dist/',
  dbr: 'https://cdn.jsdelivr.net/npm/dynamsoft-barcode-reader@10.2.10/dist/',
  // "dlrData" refers to the location of the Convolutional Neural Network (CNN) inference model used for dlr recognition.
  dlrData:
    'https://cdn.jsdelivr.net/npm/dynamsoft-label-recognizer-data@1.0.11/dist/',
};

// MRZ
LicenseManager.initLicense(
  'My-Key',
  true,
);

CoreModule.loadWasm(['DLR', 'DCP', 'DBR']);
CodeParserModule.loadSpec(['MRTD_TD3_PASSPORT']);
LabelRecognizerModule.loadRecognitionData('MRZ');
