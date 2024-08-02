<script setup>
import { onMounted, onBeforeUnmount, ref, getCurrentInstance } from 'vue';
import '../dbr';
import { useRouter } from 'vue-router';
import { CameraEnhancer, CameraView } from 'dynamsoft-camera-enhancer';
import { CaptureVisionRouter } from 'dynamsoft-capture-vision-router';
import IconCaretOutline from '../components/icons/IconBackCaret.vue';
import LogoLoader from '../components/LogoLoader.vue';
import { useCustomersStore } from '../stores/fourleaf';
import { capitalize } from '../utils/formatFunctions';
import { EnumCapturedResultItemType } from 'dynamsoft-core';

const componentDestroyedErrorMsg = 'VideoCapture Component Destroyed';

const cameraViewContainer = ref(null);
const router = useRouter();
const customersStore = useCustomersStore();

function getNeedShowFields(result) {
  const parseResultInfo = {};
  if (!result.exception) {
    let name = result.getFieldValue('name');
    parseResultInfo['Name'] = name;

    let gender = result.getFieldValue('sex');
    parseResultInfo['Gender'] = gender;

    let birthYear = result.getFieldValue('birthYear');
    let birthMonth = result.getFieldValue('birthMonth');
    let birthDay = result.getFieldValue('birthDay');
    if (parseInt(birthYear) > new Date().getFullYear() % 100) {
      birthYear = '19' + birthYear;
    } else {
      birthYear = '20' + birthYear;
    }
    if (isNaN(parseInt(birthYear))) {
      parseResultInfo['Age'] = undefined;
    } else {
      let age = new Date().getUTCFullYear() - parseInt(birthYear);
      parseResultInfo['Age'] = age;
    }
    let documentNumber = result.getFieldValue('passportNumber');
    parseResultInfo['Document Number'] = documentNumber;

    let issuingState = result.getFieldValue('issuingState');
    parseResultInfo['Issuing State'] = issuingState;

    let nationality = result.getFieldValue('nationality');
    parseResultInfo['Nationality'] = nationality;

    parseResultInfo['Date of Birth (YYYY-MM-DD)'] =
      birthYear + '-' + birthMonth + '-' + birthDay;

    let expiryYear = result.getFieldValue('expiryYear');
    let expiryMonth = result.getFieldValue('expiryMonth');
    let expiryDay = result.getFieldValue('expiryDay');
    if (parseInt(expiryYear) >= 60) {
      expiryYear = '19' + expiryYear;
    } else {
      expiryYear = '20' + expiryYear;
    }
    parseResultInfo['Date of Expiry (YYYY-MM-DD)'] =
      expiryYear + '-' + expiryMonth + '-' + expiryDay;

    let personalNumber = result.getFieldValue('personalNumber');
    parseResultInfo['Personal Number'] = personalNumber;

    let primaryIdentifier = result.getFieldValue('primaryIdentifier');
    parseResultInfo['Primary Identifier(s)'] = primaryIdentifier;

    let secondaryIdentifier = result.getFieldValue('secondaryIdentifier');
    parseResultInfo['Secondary Identifier(s)'] = secondaryIdentifier;
  }
  return parseResultInfo;
}

const config = {
  CaptureVisionTemplates: [
    {
      Name: 'ReadPassport',
      ImageROIProcessingNameArray: ['ROI_OriginalImage'],
      SemanticProcessingNameArray: ['SP_Passport'],
      OutputOriginalImage: 1,
    },
  ],
  LabelRecognizerTaskSettingOptions: [
    {
      Name: 'Task_RecognizeMRZonPassport',
      TextLineSpecificationNameArray: ['TLS_Passport'],
      SectionImageParameterArray: [
        {
          Section: 'ST_TEXT_LINE_LOCALIZATION',
          ImageParameterName: 'IP_RecognizePassport',
        },
      ],
    },
  ],
  TextLineSpecificationOptions: [
    {
      Name: 'TLS_Template',
      CharacterModelName: 'MRZ',
      CharHeightRange: [5, 1000, 1],
      ConfusableCharactersCorrection: {
        ConfusableCharacters: [
          ['0', 'O'],
          ['1', 'I'],
          ['5', 'S'],
        ],
        FontNameArray: ['OCR_B'],
      },
      BinarizationModes: [
        {
          BlockSizeX: 30,
          BlockSizeY: 30,
          Mode: 'BM_LOCAL_BLOCK',
          MorphOperation: 'Close',
        },
      ],
    },
    {
      Name: 'TLS_Passport',
      BaseTextLineSpecificationName: 'TLS_Template',
      OutputResults: 1,
      ConcatResults: 1,
      SubGroups: [
        {
          StringRegExPattern: '(P[A-Z<][A-Z<]{3}[A-Z<]{39}){(44)}',
          StringLengthRange: [44, 44],
          BaseTextLineSpecificationName: 'TLS_Template',
          TextLinesCount: 1,
        },
        {
          StringRegExPattern:
            '([A-Z0-9<]{9}[0-9][A-Z<]{3}[0-9]{2}[(01-12)][(01-31)][0-9][MF<][0-9]{2}[(01-12)][(01-31)][0-9][A-Z0-9<]{14}[0-9<][0-9]){(44)}',
          StringLengthRange: [44, 44],
          BaseTextLineSpecificationName: 'TLS_Template',
          TextLinesCount: 1,
        },
      ],
    },
  ],
  ImageParameterOptions: [
    {
      Name: 'IP_RecognizePassport',
      TextureDetectionModes: [
        {
          Mode: 'TDM_GENERAL_WIDTH_CONCENTRATION',
          Sensitivity: 8,
        },
      ],
      TextDetectionMode: {
        Mode: 'TTDM_LINE',
        CharHeightRange: [5, 1000, 1],
        Direction: 'HORIZONTAL',
        Sensitivity: 7,
      },
    },
  ],
  TargetROIDefOptions: [
    {
      Name: 'ROI_OriginalImage',
      TaskSettingNameArray: ['Task_RecognizeMRZonPassport'],
    },
  ],
  CharacterModelOptions: [
    {
      Name: 'MRZ',
    },
  ],
  SemanticProcessingOptions: [
    {
      Name: 'SP_Passport',
      ReferenceObjectFilter: {
        ReferenceTargetROIDefNameArray: ['ROI_OriginalImage'],
        AtomicResultTypeArray: ['ART_TEXT_LINE'],
      },
      TaskSettingNameArray: ['ParsePassport'],
    },
  ],
  CodeParserTaskSettingOptions: [
    {
      Name: 'ParsePassport',
      CodeSpecifications: ['MRTD_TD3_PASSPORT'],
    },
  ],
  GlobalParameter: {
    MaxTotalImageDimension: 0,
  },
};

let resolveInit;
const pInit = new Promise((r) => {
  resolveInit = r;
});
let isDestroyed = false;

let cvRouter;
let cameraEnhancer;
let cameraView;

onMounted(async () => {
  try {
    const internalInstance = getCurrentInstance();
    cameraViewContainer.value = internalInstance?.refs.cameraViewContainer;

    cameraView = await CameraView.createInstance();
    cameraEnhancer = await CameraEnhancer.createInstance(cameraView);

    await cameraView.setUIElement(cameraViewContainer.value);
    cameraView.setVideoFit('cover');
    await cameraEnhancer.setResolution({ width: 1920, height: 1080 });

    cvRouter = await CaptureVisionRouter.createInstance();
    await cvRouter.initSettings(config);
    cvRouter.setInput(cameraEnhancer);

    cameraEnhancer.setScanRegion({
      x: 10,
      y: 10,
      width: 80,
      height: 80,
      isMeasuredInPercentage: true,
    });

    cvRouter.addResultReceiver({
      onCapturedResultReceived: async (result) => {
        const recognizedResults = result.textLineResultItems;
        if (!recognizedResults) return;

        const resultsContainer = document.querySelector('#results');

        resultsContainer.textContent = '';
        for (let item of result.items) {
          if (
            item.type === EnumCapturedResultItemType.CRIT_BARCODE ||
            item.type === EnumCapturedResultItemType.CRIT_TEXT_LINE
          ) {
            const parsedResults = result.parsedResultItems;
            const parseResultInfo = getNeedShowFields(parsedResults[0]);
            customersStore.currentCustomer = {
              firstName: capitalize(parseResultInfo['Secondary Identifier(s)']),
              lastName: capitalize(parseResultInfo['Primary Identifier(s)']),
            };
            router.push({ name: 'customers' });
          }
        }
      },
    });

    await cameraEnhancer.open();
    await cvRouter.startCapturing('ReadPassport');
  } catch (ex) {
    if (ex?.message === componentDestroyedErrorMsg) {
      console.log(componentDestroyedErrorMsg);
    } else {
      let errMsg = ex.message || ex;
      console.error(errMsg);
      alert(errMsg);
    }
  }

  resolveInit();
});

// dispose cvRouter when it's no longer needed
onBeforeUnmount(async () => {
  isDestroyed = true;
  try {
    await pInit; // Wait for the pInit to complete before disposing resources.
    cvRouter?.dispose();
    cameraEnhancer?.dispose();
  } catch (_) {}
});
</script>

<template>
  <div ref="cameraViewContainer" class="component-barcode-scanner">
    <div class="dce-scanarea border-radius">
      <div class="flex items-center" style="height: 80%; position: absolute">
        <LogoLoader color="#BDF3D4" />
      </div>
      <div class="border-radius">
        <div class="dce-video-container"></div>
      </div>
      <div class="dce-scanlight"></div>
      <div class="camera-title">
        <!-- <h1>Scan the barcode on the <b>back</b> of the ID</h1> -->
      </div>
      <a class="top left" @click="$router.go(-1)">
        <div class="camera-button">
          <IconCaretOutline fill="#fff" />
        </div>
      </a>
      <div class="right top">
        <div class="camera-select">
          <select class="dce-sel-camera"></select>
        </div>
      </div>
      <div id="results"></div>
      <!-- Removing temporarily until we include scanning in other flows  -->
      <!-- <a class="right bottom flex flex-row" @click="$router.go(-1)">
        <button class="link link-white camera-link">Manual Entry</button>
      </a> -->
    </div>
  </div>
</template>

<style scoped lang="scss">
canvas {
  border-radius: 20px;
}
.canvas {
  border-radius: 20px;
}

*:focus {
  outline: none;
}

.container {
  max-width: 100%;
}

h1 {
  font-size: 1.5rem;
  font-weight: 400;
}
.component-barcode-scanner {
  width: 100%;
  height: 100%;
  /* min-width: 640px; */
  min-height: 480px;
  /* background: #eee; */
  position: relative;
  resize: both;
  border-radius: 20px;
}

.dce-video-container {
  /* position: absolute;
  left: 0;
  top: 0; */
  width: 100%;
  /* min-width: 80%; */
  /* width: auto; */
  /* max-width: 100%; */
  height: 100%;
  border-radius: 20px !important;
}

.border-radius {
  width: 100%;
  height: 100%;
  border-radius: 20px !important;
  -webkit-border-radius: 20px;
  -moz-border-radius: 20px;
  border-radius: 20px;
  -webkit-transform: translateZ(0);
  -webkit-mask-image: -webkit-radial-gradient(circle, white 100%, black 100%);
  -khtml-border-radius: 20px;
}

.dce-scanarea {
  width: 100%;
  height: 100%;
  /* position: absolute; */
  left: 0;
  top: 0;
  overflow: hidden;
  border-radius: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  margin: auto;
  -webkit-border-radius: 20px;
  -moz-border-radius: 20px;
  border-radius: 20px;
  -khtml-border-radius: 20px;
}

.dce-scanlight {
  display: none;
  width: 100%;
  height: 70px;
  margin-top: -55px;
  position: absolute;
  animation: dce-scanlight 3s infinite;
  background-image: linear-gradient(
    rgba(255, 255, 255, 0),
    rgb(189, 243, 212, 0.5),
    rgb(189, 243, 212)
  );
  border-bottom-width: 3px;
  border-bottom-style: solid;
  border-bottom-color: rgb(82, 177, 134);
}

.div-select-container {
  /* position: absolute; */
  left: 0;
  top: 0;
}

.dce-sel-camera {
  display: block;
}

.select {
  font-size: 1rem;
  width: 300px;
  border: 1px solid #fff;
  border-radius: 10px;
  padding: 1rem;
  background-size: 30px;
  background-position: calc(100% - 10px);
}

.camera-select {
  height: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 10px;
  background-color: rgba(0, 0, 0, 0.25);
  select {
    height: 50px;
    padding: 0 2rem 0 1rem;
    border-radius: 10px;
    background-position: calc(100% - 10px);
    background-size: 12px;
    &:hover {
      cursor: pointer;
    }
  }
  &:hover {
    background-color: rgba(256, 256, 256, 0.25);
    cursor: pointer;
    border: none;
    outline: none;
  }
  &:focus {
    background-color: #121212;
  }
  &:active {
    background-color: #121212;
  }
}

.dce-sel-camera {
  border: none;
  &:active {
    background-color: #121212;
    border: none;
  }
}

.camera-link {
  height: 36px;
  &:hover {
    background-color: rgba(0, 0, 0, 0.25);
    color: #fff;
  }
  &:active {
    border: none;
    box-shadow: none;
  }
}

.dce-sel-resolution {
  display: block;
  margin-top: 5px;
}

.camera-title {
  position: absolute;
  // top: 7%;
  bottom: 6%;
  padding: 0 0.5rem;
  border-radius: 5px;
  /* background-color: rgba(256, 256, 256, .25); */
  background-color: rgba(0, 0, 0, 0.25);
  max-width: 60%;
  /* transform: translateX(-50%); */
}

.camera-button {
  position: absolute;
  top: 6%;
  // left: 5%;
  height: 50px;
  width: 50px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 10px;
  background-color: rgba(0, 0, 0, 0.25);
  &:hover {
    background-color: rgba(256, 256, 256, 0.25);
    cursor: pointer;
  }
  &:active {
    background-color: #121212;
  }
  /* transform: translateX(-50%); */
}

.top {
  top: 6%;
  position: absolute;
  margin-bottom: 1rem;
}

.bottom {
  bottom: 6%;
  position: absolute;
  margin-top: 1rem;
}
.right {
  right: 4%;
  position: absolute;
  margin-left: 1rem;
}
.left {
  left: 4%;
  position: absolute;
  margin-right: 1rem;
}

.center {
  left: 50%;
}

@keyframes dce-scanlight {
  from {
    top: 0;
  }

  to {
    top: 97%;
  }
}

@keyframes dbrScanner-scanlight {
  from {
    top: 0;
  }

  to {
    top: 97%;
  }
}
</style>
