# AWS S3 배포 가이드

이 프로젝트는 정적 웹사이트이므로 **AWS S3만으로 배포가 가능**합니다. 추가 서버나 Lambda 함수 없이 간단하게 배포할 수 있습니다.

## 배포 단계

### 1. S3 버킷 생성

1. AWS 콘솔에서 S3 서비스로 이동
2. "버킷 만들기" 클릭
3. 버킷 이름 입력 (예: `arab-bible-viewer`)
4. 리전 선택
5. "버킷 만들기" 클릭

### 2. 정적 웹사이트 호스팅 활성화

1. 생성한 버킷 선택
2. "속성" 탭으로 이동
3. 맨 아래 "정적 웹사이트 호스팅" 섹션 찾기
4. "편집" 클릭
5. "정적 웹사이트 호스팅 활성화" 선택
6. 인덱스 문서: `index.html` 입력
7. "변경 사항 저장" 클릭
8. **엔드포인트 URL을 복사해두세요** (예: `http://arab-bible-viewer.s3-website-us-east-1.amazonaws.com`)

### 3. 버킷 정책 설정 (공개 읽기 권한)

1. 버킷의 "권한" 탭으로 이동
2. "버킷 정책" 섹션에서 "편집" 클릭
3. 다음 정책을 입력 (버킷 이름을 실제 이름으로 변경):

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::arab-bible-viewer/*"
        }
    ]
}
```

4. "변경 사항 저장" 클릭

### 4. CORS 설정 (PDF.js Worker를 위해 필요)

1. 버킷의 "권한" 탭으로 이동
2. "교차 출처 리소스 공유(CORS)" 섹션에서 "편집" 클릭
3. 다음 CORS 설정 입력:

```json
[
    {
        "AllowedHeaders": ["*"],
        "AllowedMethods": ["GET", "HEAD"],
        "AllowedOrigins": ["*"],
        "ExposeHeaders": []
    }
]
```

4. "변경 사항 저장" 클릭

### 5. 파일 업로드

#### 방법 1: AWS 콘솔에서 업로드

1. 버킷 선택
2. "업로드" 버튼 클릭
3. 다음 파일들을 선택:
   - `index.html`
   - `style.css`
   - `script.js`
   - `Good News For Sudanese (Free PDF).pdf`
4. "업로드" 클릭

#### 방법 2: AWS CLI 사용

```bash
aws s3 sync . s3://arab-bible-viewer --exclude ".git/*" --exclude ".gitignore" --exclude "README.md" --exclude "DEPLOY.md"
```

### 6. CloudFront 설정 (선택사항, HTTPS를 위해 권장)

S3 정적 웹사이트 호스팅은 HTTP만 지원합니다. HTTPS를 사용하려면 CloudFront를 추가해야 합니다.

1. CloudFront 콘솔로 이동
2. "배포 만들기" 클릭
3. 원본 도메인: S3 버킷의 정적 웹사이트 호스팅 엔드포인트 선택 (버킷 자체가 아님!)
4. 뷰어 프로토콜 정책: "리디렉션 HTTP에서 HTTPS" 선택
5. "배포 만들기" 클릭
6. 배포가 완료되면 CloudFront 도메인 이름 사용

## 주의사항

### PDF.js Worker 파일

현재 코드는 CDN에서 PDF.js worker를 로드하므로 CORS 문제가 없습니다. 만약 로컬에 worker 파일을 호스팅한다면 CORS 설정이 제대로 되어 있어야 합니다.

### 비용

- S3 저장소: 매우 저렴 (GB당 약 $0.023/월)
- 데이터 전송: 처음 1GB 무료, 이후 GB당 약 $0.09
- CloudFront (선택사항): 처음 1TB 무료, 이후 GB당 약 $0.085

## 빠른 배포 스크립트 (AWS CLI 사용)

```bash
# 버킷 생성 (한 번만 실행)
aws s3 mb s3://arab-bible-viewer

# 정적 웹사이트 호스팅 활성화
aws s3 website s3://arab-bible-viewer --index-document index.html

# 파일 업로드
aws s3 sync . s3://arab-bible-viewer \
  --exclude ".git/*" \
  --exclude ".gitignore" \
  --exclude "README.md" \
  --exclude "DEPLOY.md" \
  --acl public-read

# 버킷 정책 설정
aws s3api put-bucket-policy --bucket arab-bible-viewer --policy file://bucket-policy.json
```

`bucket-policy.json` 파일 내용:
```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::arab-bible-viewer/*"
        }
    ]
}
```

## 접속 URL

배포 완료 후 다음 URL로 접속:
- S3 직접: `http://arab-bible-viewer.s3-website-[리전].amazonaws.com`
- CloudFront (설정한 경우): `https://[CloudFront 도메인]`
