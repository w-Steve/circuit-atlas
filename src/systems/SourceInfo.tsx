import {t} from "../i18n";
import { useRef } from "react";
import {TimingReference} from '../components/TimingLayer';
import {shanghaiTimingSource} from '../circuits/shanghai/timing';
export function SourceInfo({embedded=false}:{embedded?:boolean}) {
  const ref = useRef<HTMLDialogElement>(null);
  const content=<>
        <p> {t("完整赛道采用公开 GIS，与 FIA 2026 场地图核对，并统一至 5.451 km。所有速度、距离和相机取景使用同一套米制世界。")} </p>
        <p>{t("地形采用 GEDTM30 约30米地面高程，真实比例、不放大。上海路面由沿线高程做45米距离平滑估算，看台与P房基础仍为估计；不是2026实测路面。")}</p>
        <TimingReference source={shanghaiTimingSource}/>
        <p>
          <b> {t("看台坡度、建筑尺寸、围网和标线位置是可校准估算，不是座位视野保证。")} </b>{" "} {t("下层坡面约 3–13 m，上层约 17–32 m，坐姿眼高另加 1.2 m。P 房距离取建筑前沿中心；发车线与计时线分别取中心点。")} </p>
        <p> {t("车辆为通用 2026 比例模型：长约 5.2 m、宽 1.9 m、轴距 3.4 m。恒速经过用于感受距离与速度，不是比赛遥测。")} </p>
        <p> {t("1× 为 24 mm 全画幅等效焦距，按相同对角线转换到 4:3。占比是裁切后车体横向投影范围，不扣除围网遮挡。照片按当前快门真实采样曝光运动；理想跟拍不包含手抖或对焦误差，不预测具体手机的传感器画质。")} </p>
        <p> {t("赛道数据 © Tomislav Bacinger / MIT。未复制官方照片、地图素材或品牌模型。 看台及部分草地平面边界来自 © OpenStreetMap contributors（ODbL），C草地区为官方场地图定位估算。坡度、眼高、围网位置以及A铂金子区域边界均非测绘。")} </p>
        <div className="source-links">
          <a href="https://zenodo.org/records/18887460" target="_blank" rel="noreferrer">GEDTM30 · CC BY 4.0 ↗</a>
          <a href="https://cgejournal.com/cn/article/pdf/preview/15108.pdf" target="_blank" rel="noreferrer">{t("上海赛道历史工程资料 ↗")}</a>
          <a href={`${import.meta.env.BASE_URL}licenses/THIRD_PARTY_NOTICES.txt`} target="_blank" rel="noreferrer">{t("组件与字体许可 ↗")}</a>
          <a
            href="https://github.com/bacinger/f1-circuits"
            target="_blank"
            rel="noreferrer"
          > {t("轨迹来源与授权 ↗")} </a>
          <a
            href="https://www.formula1.com/en/racing/2026/china"
            target="_blank"
            rel="noreferrer"
          > {t("F1 场地资料 ↗")} </a>
        </div>
  </>;
  if(embedded)return <div className="venue-source-content">{content}</div>;
  return (
    <>
      <button
        className="source-button"
        aria-label={t("数据与假设 ↗")}
        onClick={() => ref.current?.showModal()}
      >
        ⓘ
      </button>
      <dialog className="source-dialog" ref={ref} onClick={e=>{const r=e.currentTarget.getBoundingClientRect();if(e.target===e.currentTarget&&(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom))ref.current?.close()}}>
        <div className="panel-title"> {t("关于这片视野")}{" "}
          <button onClick={() => ref.current?.close()}>{t("关闭说明")}</button>
        </div>
        {content}
      </dialog>
    </>
  );
}
