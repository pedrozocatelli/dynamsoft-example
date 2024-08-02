<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, type Ref, getCurrentInstance } from "vue";
import "../dbr";
import { useRouter } from 'vue-router';
import { CameraEnhancer, CameraView } from "dynamsoft-camera-enhancer";
import { CaptureVisionRouter } from "dynamsoft-capture-vision-router";
import { MultiFrameResultCrossFilter } from "dynamsoft-utility";
import IconCaretOutline from '../components/icons/IconBackCaret.vue';
import LogoLoader from '../components/LogoLoader.vue';
import { useCustomersStore } from '../stores/fourleaf';
import { capitalize } from '../utils/formatFunctions';

const componentDestroyedErrorMsg = "VideoCapture Component Destroyed";

const cameraViewContainer: Ref<HTMLElement | null> = ref(null);
const router = useRouter();
const customersStore = useCustomersStore();

let resolveInit: () => void;
const pInit: Promise<void> = new Promise(r => { resolveInit = r });
let isDestroyed = false;


let cvRouter: CaptureVisionRouter;
let cameraEnhancer: CameraEnhancer;
let parser = null;

function getField(fieldName, data) {
    const getData = (start, end) => data.split('ANSI ')[1].split(start)[1].split(end)[0].split('\n')[0];

    const fieldMap = {
        'lName': () => getData('DCS', 'DD'),
        'fName': () => getData('DAC', 'DD'),
        'DOBDay': () => getData('DBB', 'DBA').slice(2, 4),
        'DOBMonth': () => getData('DBB', 'DBA').slice(0, 2),
        'DOBYear': () => getData('DBB', 'DBA').slice(4),
        'idExpirationDay': () => getData('DBA', 'DBC').slice(2, 4),
        'idExpirationMonth': () => getData('DBA', 'DBC').slice(0, 2),
        'idExpirationYear': () => getData('DBA', 'DBC').slice(4),
        'state': () => getData('DAJ', 'DAK'),
        'streetAddress': () => getData('DAG', 'DAI'),
        'city': () => getData('DAI', 'DAJ'),
        'zipCode': () => getData('DAK', 'DCF').slice(0, 5),
        'expDate': () => {
            const expData = getData('DBA', 'DBC');
            const day = expData.slice(2, 4);
            const month = expData.slice(0, 2);
            const year = expData.slice(4);
            return `${year}-${month}-${day}`;
        },
        'idNumber': () => getData('DAQ', 'DCS'),
        'idState': () => data.split('ANSI ')[1].slice(0, 6) // Assuming the return of iin as idState
    };

    return fieldMap[fieldName] ? fieldMap[fieldName]() : data;
}

onMounted(async () => {

  try {

    const internalInstance = getCurrentInstance();
    cameraViewContainer.value = internalInstance?.refs.cameraViewContainer as HTMLElement;
    const cameraView = await CameraView.createInstance();
    if (isDestroyed) { throw Error(componentDestroyedErrorMsg); } // Check if component is destroyed after every async

    cameraEnhancer = await CameraEnhancer.createInstance(cameraView);
    if (isDestroyed) { throw Error(componentDestroyedErrorMsg); }


    await cameraView.setUIElement(cameraViewContainer.value)

    cvRouter = await CaptureVisionRouter.createInstance();
    if (isDestroyed) { throw Error(componentDestroyedErrorMsg); }
    cvRouter.setInput(cameraEnhancer);

    // Define a callback for results.
    cvRouter.addResultReceiver({
      onDecodedBarcodesReceived: (result) => {
        if (!result.barcodeResultItems.length) return;

        for (let item of result.barcodeResultItems) {
          customersStore.currentCustomer= {
          firstName: capitalize(getField('fName', item.text)),
          lastName: capitalize(getField('lName', item.text)),
          dobDay: getField('DOBDay', item.text),
          dobMonth: getField('DOBMonth', item.text),
          dobYear: getField('DOBYear', item.text),
          idState: getField('idState', item.text),
          idNumber: getField('idNumber', item.text),
          expDate: getField('expDate', item.text),
          streetAddress : getField('streetAddress', item.text),
          state : getField('state', item.text),
          city: getField('city', item.text),
          zipCode: getField('zipCode', item.text),
          idExpirationDay: getField('idExpirationDay', item.text),
          idExpirationMonth: getField('idExpirationMonth', item.text),
          idExpirationYear: getField('idExpirationYear', item.text),
        }
        if ( router.options.history.state.back == '/customers/check-in'){
          router.back();
        }
        router.push({ name: 'customers' });
        }
      },
    });

    // Filter out unchecked and duplicate results.
    const filter = new MultiFrameResultCrossFilter();
    // Filter out unchecked barcodes.
    filter.enableResultCrossVerification("barcode", true);
    // Filter out duplicate barcodes within 3 seconds.
    filter.enableResultDeduplication("barcode", true);
    await cvRouter.addResultFilter(filter);
    if (isDestroyed) { throw Error(componentDestroyedErrorMsg); }

    // Open camera and start scanning single barcode.
    await cameraEnhancer.open();
    if (isDestroyed) { throw Error(componentDestroyedErrorMsg); }
    await cvRouter.startCapturing("ReadSingleBarcode");
    if (isDestroyed) { throw Error(componentDestroyedErrorMsg); }

  } catch (ex: any) {

    if ((ex as Error)?.message === componentDestroyedErrorMsg) {
      console.log(componentDestroyedErrorMsg);
    } else {
      let errMsg = ex.message || ex;
      console.error(errMsg);
      alert(errMsg);
    }
  }

  // Resolve pInit promise once initialization is complete.
  resolveInit!();
});

// dispose cvRouter when it's no longer needed
onBeforeUnmount(async () => {
  isDestroyed = true;
  try {
    await pInit; // Wait for the pInit to complete before disposing resources.
    cvRouter?.dispose();
    cameraEnhancer?.dispose();
  } catch (_) { }
});
</script>

<template>
  <div ref="cameraViewContainer" class="component-barcode-scanner">
    <div class="dce-scanarea border-radius">
      <div class="flex items-center" style="height: 80%; position: absolute">
        <LogoLoader color="#BDF3D4" />
      </div>
      <div class="border-radius">
        <div class="dce-video-container">
        </div>
      </div>
      <div class="dce-scanlight"></div>
      <div class="camera-title">
        <h1>Scan the barcode on the <b>back</b> of the ID</h1>
      </div>
      <a class="top left" @click="$router.go(-1)">
      <div class="camera-button">
        <IconCaretOutline fill="#fff" />
      </div>
      </a>
      <div class="right top">

        <div class="camera-select">
        <select class="dce-sel-camera"></select></div>
      </div>
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
